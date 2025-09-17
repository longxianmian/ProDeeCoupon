<template>
  <div class="admin-campaigns">
    <el-card shadow="never" class="page-header">
      <div class="header-content">
        <div class="header-left">
          <el-button @click="$router.back()" :icon="ArrowLeft">{{ $t('common.back') }}</el-button>
          <h2>{{ $t('admin.menu.activityManagement') }}</h2>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="showAddCampaign = true" :icon="Plus">
            {{ $t('admin.campaigns.addCampaign') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="campaigns-content">
      <!-- 搜索栏 -->
      <div class="search-section">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-input
              v-model="searchKeyword"
              :placeholder="$t('admin.campaigns.searchPlaceholder')"
              @input="handleSearch"
              @clear="handleSearch"
              clearable
              :prefix-icon="Search"
            />
          </el-col>
          <el-col :span="6">
            <el-select
              v-model="statusFilter"
              :placeholder="$t('admin.campaigns.statusFilter')"
              @change="handleSearch"
              clearable
            >
              <el-option :label="$t('common.allStatuses')" value="" />
              <el-option :label="$t('admin.campaigns.active')" value="active" />
              <el-option :label="$t('admin.campaigns.inactive')" value="inactive" />
              <el-option :label="$t('admin.campaigns.expired')" value="expired" />
            </el-select>
          </el-col>
        </el-row>
      </div>

      <!-- 活动数据表格 -->
      <el-table 
        :data="campaignList" 
        v-loading="loading"
        stripe
        style="width: 100%; margin-top: 20px;"
      >
        <el-table-column type="index" width="50" />
        <el-table-column 
          prop="image_url" 
          :label="$t('admin.campaigns.image')"
          width="80"
        >
          <template #default="scope">
            <el-image
              v-if="getMainImage(scope.row)"
              :src="getMainImage(scope.row)"
              :preview-src-list="[getMainImage(scope.row)]"
              style="width: 60px; height: 40px; border-radius: 4px;"
              fit="cover"
              preview-teleported
            />
            <span v-else style="color: #999;">{{ $t('admin.campaigns.noImage') }}</span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="title" 
          :label="$t('admin.campaigns.title')"
          min-width="150"
        />
        <el-table-column 
          :label="$t('admin.campaigns.price')"
          width="150"
        >
          <template #default="scope">
            <div>
              <div style="color: #f56c6c; font-weight: 500;">
                {{ getPriceSummary(scope.row) }}
              </div>
              <div style="color: #999; font-size: 12px;">
                {{ getCouponTypeLabel(scope.row.coupon_type) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column 
          :label="$t('admin.campaigns.progress')"
          width="120"
        >
          <template #default="scope">
            <div>
              <div style="font-size: 12px; color: #666;">
                {{ scope.row.claimed_count }}/{{ scope.row.quantity }}
              </div>
              <el-progress 
                :percentage="Math.round((scope.row.claimed_count / scope.row.quantity) * 100)" 
                :stroke-width="6"
                :show-text="false"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column 
          :label="$t('admin.campaigns.validity')"
          width="180"
        >
          <template #default="scope">
            <div style="font-size: 12px;">
              <div>{{ formatDate(scope.row.valid_from) }}</div>
              <div>{{ formatDate(scope.row.valid_to) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column 
          :label="$t('admin.campaigns.status')"
          width="100"
        >
          <template #default="scope">
            <el-tag 
              :type="getStatusType(scope.row.status)"
              size="small"
            >
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column 
          :label="$t('admin.campaigns.actions')"
          width="180"
          fixed="right"
        >
          <template #default="scope">
            <el-button 
              size="small" 
              @click="editCampaign(scope.row)"
              :icon="Edit"
            >
              {{ $t('admin.campaigns.edit') }}
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteCampaign(scope.row)"
              :icon="Delete"
            >
              {{ $t('admin.campaigns.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalCount"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑活动对话框 -->
    <el-dialog 
      v-model="showAddCampaign" 
      :title="editingCampaign ? $t('admin.campaigns.editCampaign') : $t('admin.campaigns.addCampaign')"
      width="800px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="campaignForm" :rules="formRules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.title')" prop="title">
              <el-input
                v-model="campaignForm.title"
                :placeholder="$t('admin.campaigns.titlePlaceholder')"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.description')" prop="description">
              <el-input
                v-model="campaignForm.description"
                type="textarea"
                :rows="3"
                :placeholder="$t('admin.campaigns.descriptionPlaceholder')"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 券类型选择 -->
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.couponType')" prop="coupon_type">
              <el-select 
                v-model="campaignForm.coupon_type" 
                @change="handleCouponTypeChange"
                style="width: 100%"
                :placeholder="$t('admin.campaigns.couponTypePlaceholder')"
              >
                <el-option
                  v-for="type in couponTypes"
                  :key="type.value"
                  :label="type.label"
                  :value="type.value"
                >
                  <span style="float: left">{{ type.label }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">{{ type.example }}</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 动态价格字段 -->
        <div v-if="campaignForm.coupon_type === 'final_price'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.originalPrice')">
                <el-input-number
                  v-model="campaignForm.original_price"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.originalPricePlaceholder')"
                />
                <div class="field-note">{{ $t('admin.campaigns.optionalField') }}</div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.finalPrice')" prop="price_final">
                <el-input-number
                  v-model="campaignForm.price_final"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.finalPricePlaceholder')"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="campaignForm.coupon_type === 'gift_card'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.faceValue')" prop="face_value">
                <el-input-number
                  v-model="campaignForm.face_value"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.faceValuePlaceholder')"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="campaignForm.coupon_type === 'cash_voucher'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.amountOff')" prop="amount_off">
                <el-input-number
                  v-model="campaignForm.amount_off"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.amountOffPlaceholder')"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="campaignForm.coupon_type === 'full_reduction'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.minSpend')" prop="min_spend">
                <el-input-number
                  v-model="campaignForm.min_spend"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.minSpendPlaceholder')"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.amountOff')" prop="amount_off">
                <el-input-number
                  v-model="campaignForm.amount_off"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.amountOffPlaceholder')"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="campaignForm.coupon_type === 'percentage_discount'">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item :label="$t('admin.campaigns.discountPercent')" prop="discount_percent">
                <el-input-number
                  v-model="campaignForm.discount_percent"
                  :min="0"
                  :max="100"
                  :precision="1"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.discountPercentPlaceholder')"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="$t('admin.campaigns.minSpend')">
                <el-input-number
                  v-model="campaignForm.min_spend"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.minSpendPlaceholder')"
                />
                <div class="field-note">{{ $t('admin.campaigns.optionalField') }}</div>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="$t('admin.campaigns.capAmount')">
                <el-input-number
                  v-model="campaignForm.cap_amount"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.capAmountPlaceholder')"
                />
                <div class="field-note">{{ $t('admin.campaigns.optionalField') }}</div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="campaignForm.coupon_type === 'fixed_discount'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.amountOff')" prop="amount_off">
                <el-input-number
                  v-model="campaignForm.amount_off"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.amountOffPlaceholder')"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('admin.campaigns.minSpend')">
                <el-input-number
                  v-model="campaignForm.min_spend"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('admin.campaigns.minSpendPlaceholder')"
                />
                <div class="field-note">{{ $t('admin.campaigns.optionalField') }}</div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('admin.campaigns.quantity')" prop="quantity">
              <el-input-number
                v-model="campaignForm.quantity"
                :min="1"
                style="width: 100%"
                :placeholder="$t('admin.campaigns.quantityPlaceholder')"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('admin.campaigns.status')" prop="status">
              <el-radio-group v-model="campaignForm.status">
                <el-radio label="active">{{ $t('admin.campaigns.active') }}</el-radio>
                <el-radio label="inactive">{{ $t('admin.campaigns.inactive') }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('admin.campaigns.validFrom')" prop="valid_from">
              <el-date-picker
                v-model="campaignForm.valid_from"
                type="datetime"
                :placeholder="$t('admin.campaigns.validFromPlaceholder')"
                style="width: 100%"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('admin.campaigns.validTo')" prop="valid_to">
              <el-date-picker
                v-model="campaignForm.valid_to"
                type="datetime"
                :placeholder="$t('admin.campaigns.validToPlaceholder')"
                style="width: 100%"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.mediaFiles')" prop="media_files">
              <div class="media-upload-section">
                <!-- 上传组件 -->
                <el-upload
                  ref="uploadRef"
                  :action="`/api/admin/upload/campaign-media`"
                  :headers="uploadHeaders"
                  :file-list="fileList"
                  :on-success="handleMediaUploadSuccess"
                  :on-error="handleMediaUploadError"
                  :on-remove="handleMediaRemove"
                  :before-upload="beforeMediaUpload"
                  :limit="getUploadLimit()"
                  :multiple="getMultipleAllowed()"
                  :accept="getAcceptedFileTypes()"
                  list-type="picture-card"
                  name="files"
                >
                  <el-icon class="el-icon--upload"><Plus /></el-icon>
                  <div class="el-upload__text">
                    {{ $t('admin.campaigns.uploadMedia') }}<br>
                    <small>{{ $t('admin.campaigns.uploadTip') }}</small>
                  </div>
                </el-upload>
                
                <!-- 文件预览 -->
                <div v-if="campaignForm.media_files && campaignForm.media_files.length > 0" class="media-preview">
                  <div v-for="(media, index) in campaignForm.media_files" :key="index" class="media-item">
                    <div v-if="media.type === 'image'" class="image-preview">
                      <el-image
                        :src="media.url"
                        :preview-src-list="getImageUrls()"
                        style="width: 100px; height: 100px;"
                        fit="cover"
                        preview-teleported
                      />
                      <div class="media-overlay">
                        <el-button 
                          type="danger" 
                          size="small" 
                          :icon="Delete"
                          @click="removeMediaFile(index)"
                          circle
                        />
                      </div>
                    </div>
                    <div v-else-if="media.type === 'video'" class="video-preview">
                      <video 
                        :src="media.url" 
                        style="width: 100px; height: 100px;" 
                        controls
                        @click.stop
                      />
                      <div class="media-overlay">
                        <el-button 
                          type="danger" 
                          size="small" 
                          :icon="Delete"
                          @click="removeMediaFile(index)"
                          circle
                        />
                      </div>
                    </div>
                    <div class="media-info">
                      <div class="file-name">{{ media.originalName || media.filename }}</div>
                      <div class="file-size">{{ formatFileSize(media.size) }}</div>
                    </div>
                  </div>
                </div>
                
                <div class="upload-tips">
                  <p>{{ $t('admin.campaigns.uploadLimits') }}</p>
                  <p class="mutex-tip">{{ $t('admin.campaigns.mediaMutexTip') }}</p>
                </div>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('admin.campaigns.stores')" prop="store_ids">
              <!-- 府县筛选器 -->
              <div class="store-filters" style="margin-bottom: 12px;">
                <el-row :gutter="12">
                  <el-col :span="8">
                    <el-select
                      v-model="selectedProvince"
                      :placeholder="$t('admin.campaigns.selectProvince')"
                      @change="handleProvinceChange"
                      clearable
                      style="width: 100%"
                    >
                      <el-option
                        v-for="province in availableProvinces"
                        :key="province.code"
                        :label="province.name"
                        :value="province.code"
                      />
                    </el-select>
                  </el-col>
                  <el-col :span="8">
                    <el-select
                      v-model="selectedDistrict"
                      :placeholder="$t('admin.campaigns.selectDistrict')"
                      @change="handleDistrictChange"
                      clearable
                      style="width: 100%"
                      :disabled="!selectedProvince"
                    >
                      <el-option
                        v-for="district in availableDistricts"
                        :key="district.code"
                        :label="district.name"
                        :value="district.code"
                      />
                    </el-select>
                  </el-col>
                  <el-col :span="8">
                    <el-button @click="clearFilters" style="width: 100%">
                      {{ $t('admin.campaigns.clearFilters') }}
                    </el-button>
                  </el-col>
                </el-row>
              </div>
              
              <!-- 门店选择器（按区域分组显示） -->
              <el-select
                v-model="campaignForm.store_ids"
                multiple
                :placeholder="$t('admin.campaigns.storesPlaceholder')"
                style="width: 100%"
                @change="handleStoreSelection"
                collapse-tags
                collapse-tags-tooltip
              >
                <el-option-group
                  v-for="group in groupedStores"
                  :key="group.label"
                  :label="group.label"
                >
                  <el-option
                    v-for="store in group.stores"
                    :key="store.id"
                    :label="`${store.name} [${store.code}]`"
                    :value="store.id"
                  >
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span>{{ store.name }}</span>
                      <span style="color: #8492a6; font-size: 12px; margin-left: 10px;">[{{ store.code }}]</span>
                    </div>
                  </el-option>
                </el-option-group>
              </el-select>
              
              <div v-if="campaignForm.store_ids && campaignForm.store_ids.length > 0" style="margin-top: 8px; color: #666; font-size: 12px;">
                {{ $t('admin.campaigns.selectedStores') }} {{ campaignForm.store_ids.length }} {{ $t('admin.campaigns.storeCount') }}
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <template #footer>
        <el-button @click="showAddCampaign = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveCampaign" :loading="submitting">
          {{ $t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import axios from 'axios'

export default defineComponent({
  name: 'AdminCampaigns',
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    
    // 页面状态
    const loading = ref(false)
    const submitting = ref(false)
    const searchKeyword = ref('')
    const statusFilter = ref('')
    
    // 分页状态
    const currentPage = ref(1)
    const pageSize = ref(20)
    const totalCount = ref(0)
    
    // 活动列表
    const campaignList = ref([])
    
    // 添加/编辑活动
    const showAddCampaign = ref(false)
    const editingCampaign = ref(null)
    const formRef = ref()
    const campaignForm = ref({
      title: '',
      description: '',
      coupon_type: 'final_price',
      // 原有字段（向后兼容）
      original_price: null,
      discount_price: null,
      // 新的价格字段
      price_final: null,
      face_value: null,
      amount_off: null,
      min_spend: null,
      discount_percent: null,
      cap_amount: null,
      currency: 'THB',
      // 其他字段
      quantity: null,
      valid_from: '',
      valid_to: '',
      image_url: '',
      media_files: [],
      status: 'active',
      store_ids: []
    })

    // 多媒体上传相关
    const uploadRef = ref()
    const fileList = ref([])
    const selectedMediaType = ref(null) // 'image' 或 'video'，用于锁定类型
    const baseAcceptedTypes = '.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.ogg,.mov,.avi'

    // 上传请求头
    const uploadHeaders = computed(() => {
      const token = localStorage.getItem('admin_token')
      return {
        'Authorization': `Bearer ${token}`
      }
    })

    // 门店列表
    const storeList = ref([])
    
    // 府县筛选状态
    const selectedProvince = ref('')
    const selectedDistrict = ref('')
    
    // 府编码映射
    const provinceCodeMap = {
      'BK': '曼谷府',
      'CM': '清迈府', 
      'PK': '普吉府',
      'CB': '春武里府',
      'KB': '甲米府',
      'ST': '素叻他尼府',
      'AY': '大城府',
      'RY': '罗勇府',
      'NR': '呵叻府',
      'UD': '乌隆府',
      'KK': '孔敬府',
      'SK': '宋卡府',
      'NB': '暖武里府',
      'PT': '巴吞他尼府'
    }

    // 表单验证规则
    const formRules = {
      title: [
        { required: true, message: t('admin.campaigns.titleRequired'), trigger: 'blur' }
      ],
      description: [
        { required: true, message: t('admin.campaigns.descriptionRequired'), trigger: 'blur' }
      ],
      original_price: [
        { required: true, message: t('admin.campaigns.originalPriceRequired'), trigger: 'blur' }
      ],
      discount_price: [
        { required: true, message: t('admin.campaigns.discountPriceRequired'), trigger: 'blur' }
      ],
      quantity: [
        { required: true, message: t('admin.campaigns.quantityRequired'), trigger: 'blur' }
      ],
      valid_from: [
        { required: true, message: t('admin.campaigns.validFromRequired'), trigger: 'blur' }
      ],
      valid_to: [
        { required: true, message: t('admin.campaigns.validToRequired'), trigger: 'blur' }
      ],
      store_ids: [
        { required: true, message: t('admin.campaigns.storesRequired'), trigger: 'change' }
      ]
    }

    // 获取活动列表
    const loadCampaigns = async () => {
      try {
        loading.value = true
        
        const token = localStorage.getItem('admin_token')
        const response = await axios.get('/api/admin/campaigns', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            page: currentPage.value,
            limit: pageSize.value,
            search: searchKeyword.value,
            status: statusFilter.value
          }
        })

        if (response.data.success) {
          campaignList.value = response.data.data
          totalCount.value = response.data.pagination.total
        }
      } catch (error) {
        console.error('加载活动列表失败:', error)
        if (error.response?.status === 401) {
          router.push('/admin/login')
        } else {
          ElMessage.error(t('admin.campaigns.loadError'))
        }
      } finally {
        loading.value = false
      }
    }

    // 搜索
    const handleSearch = () => {
      currentPage.value = 1
      loadCampaigns()
    }

    // 分页大小改变
    const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
      loadCampaigns()
    }

    // 当前页改变
    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
      loadCampaigns()
    }

    // 编辑活动
    const editCampaign = (campaign) => {
      editingCampaign.value = campaign
      campaignForm.value = { ...campaign }
      
      // 处理媒体文件数据
      if (campaign.media_files) {
        try {
          campaignForm.value.media_files = typeof campaign.media_files === 'string' 
            ? JSON.parse(campaign.media_files) 
            : campaign.media_files
          
          // 设置类型锁定
          if (campaignForm.value.media_files.length > 0) {
            selectedMediaType.value = campaignForm.value.media_files[0].type
          }
        } catch (error) {
          console.error('解析媒体文件数据失败:', error)
          campaignForm.value.media_files = []
          selectedMediaType.value = null
        }
      } else {
        campaignForm.value.media_files = []
        selectedMediaType.value = null
      }
      
      showAddCampaign.value = true
    }

    // 删除活动
    const deleteCampaign = async (campaign) => {
      try {
        await ElMessageBox.confirm(
          t('admin.campaigns.deleteConfirmMessage', { title: campaign.title }),
          t('admin.campaigns.deleteConfirmTitle'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning',
          }
        )
        
        const token = localStorage.getItem('admin_token')
        await axios.delete(`/api/admin/campaigns/${campaign.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        ElMessage.success(t('admin.campaigns.deleteSuccess'))
        loadCampaigns()
      } catch (error) {
        if (error === 'cancel' || error === 'close') {
          return
        }
        console.error('删除活动失败:', error)
        ElMessage.error(t('admin.campaigns.deleteError'))
      }
    }

    // 保存活动
    const saveCampaign = async () => {
      const valid = await formRef.value.validate().catch(() => false)
      if (!valid) return

      try {
        submitting.value = true
        const token = localStorage.getItem('admin_token')
        const method = editingCampaign.value ? 'put' : 'post'
        const url = editingCampaign.value 
          ? `/api/admin/campaigns/${editingCampaign.value.id}`
          : '/api/admin/campaigns'

        await axios[method](url, campaignForm.value, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        ElMessage.success(editingCampaign.value ? t('admin.campaigns.updateSuccess') : t('admin.campaigns.addSuccess'))
        showAddCampaign.value = false
        resetForm()
        loadCampaigns()
      } catch (error) {
        console.error('保存活动失败:', error)
        ElMessage.error(editingCampaign.value ? t('admin.campaigns.updateError') : t('admin.campaigns.addError'))
      } finally {
        submitting.value = false
      }
    }

    // 重置表单
    const resetForm = () => {
      editingCampaign.value = null
      campaignForm.value = {
        title: '',
        description: '',
        original_price: null,
        discount_price: null,
        quantity: null,
        valid_from: '',
        valid_to: '',
        image_url: '',
        media_files: [],
        status: 'active',
        store_ids: []
      }
      fileList.value = []
      selectedMediaType.value = null // 重置类型锁定
    }

    // 计算可用的府列表
    const availableProvinces = computed(() => {
      const provinces = new Set()
      storeList.value.forEach(store => {
        if (store.code && store.code.length >= 2) {
          const provinceCode = store.code.substring(0, 2)
          if (provinceCodeMap[provinceCode]) {
            provinces.add(provinceCode)
          }
        }
      })
      return Array.from(provinces).map(code => ({
        code,
        name: provinceCodeMap[code]
      })).sort((a, b) => a.name.localeCompare(b.name))
    })

    // 计算可用的县/区列表
    const availableDistricts = computed(() => {
      if (!selectedProvince.value) return []
      
      const districts = new Set()
      storeList.value
        .filter(store => store.code && store.code.startsWith(selectedProvince.value))
        .forEach(store => {
          if (store.code.length >= 4) {
            const districtCode = store.code.substring(2, 4)
            // 从地址中提取区名
            let districtName = `区域${districtCode}`
            if (store.address) {
              // 曼谷：提取เขต后的区名
              const districtMatch = store.address.match(/(?:Khet|เขต)\s+([^,]+)/i)
              if (districtMatch) {
                districtName = districtMatch[1].trim()
              }
            }
            districts.add(`${districtCode}:${districtName}`)
          }
        })
      
      return Array.from(districts).map(item => {
        const [code, name] = item.split(':')
        return { code, name }
      }).sort((a, b) => a.name.localeCompare(b.name))
    })

    // 计算筛选后的分组门店
    const groupedStores = computed(() => {
      let filteredStores = storeList.value
      
      // 应用府筛选
      if (selectedProvince.value) {
        filteredStores = filteredStores.filter(store => 
          store.code && store.code.startsWith(selectedProvince.value)
        )
      }
      
      // 应用县/区筛选
      if (selectedDistrict.value) {
        filteredStores = filteredStores.filter(store =>
          store.code && store.code.substring(2, 4) === selectedDistrict.value
        )
      }
      
      // 按区域分组
      const groups = {}
      filteredStores.forEach(store => {
        if (!store.code || store.code.length < 4) return
        
        const provinceCode = store.code.substring(0, 2)
        const districtCode = store.code.substring(2, 4)
        const provinceName = provinceCodeMap[provinceCode] || '未知府'
        
        // 从地址中提取区名
        let districtName = `区域${districtCode}`
        if (store.address) {
          const districtMatch = store.address.match(/(?:Khet|เขต)\s+([^,]+)/i)
          if (districtMatch) {
            districtName = districtMatch[1].trim()
          }
        }
        
        const groupKey = `${provinceName} - ${districtName}`
        if (!groups[groupKey]) {
          groups[groupKey] = {
            label: groupKey,
            stores: []
          }
        }
        groups[groupKey].stores.push(store)
      })
      
      // 转换为数组并排序
      return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label))
    })

    // 府筛选变化处理
    const handleProvinceChange = () => {
      selectedDistrict.value = '' // 清空县/区选择
    }

    // 县/区筛选变化处理  
    const handleDistrictChange = () => {
      // 可以在此处添加额外逻辑
    }

    // 清空筛选器
    const clearFilters = () => {
      selectedProvince.value = ''
      selectedDistrict.value = ''
    }

    // 获取门店列表
    const loadStores = async () => {
      try {
        const token = localStorage.getItem('admin_token')
        const response = await axios.get('/api/admin/stores', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            limit: 1000  // 获取所有门店
          }
        })

        if (response.data.success) {
          storeList.value = response.data.data
        }
      } catch (error) {
        console.error('加载门店列表失败:', error)
      }
    }

    // 门店选择处理
    const handleStoreSelection = (selectedStoreIds) => {
      console.log('Selected stores:', selectedStoreIds)
    }

    // 多媒体上传前检查
    const beforeMediaUpload = (file) => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        ElMessage.error(t('admin.campaigns.uploadTypeError'))
        return false
      }
      
      const newFileType = isImage ? 'image' : 'video'
      
      // 设置或检查媒体类型锁定
      if (campaignForm.value.media_files.length === 0 && !selectedMediaType.value) {
        selectedMediaType.value = newFileType
      }
      
      const currentType = getCurrentMediaType()
      
      // 检查类型互斥
      if (currentType && currentType !== newFileType) {
        const currentTypeText = currentType === 'image' ? t('admin.campaigns.images') : t('admin.campaigns.videos')
        const newTypeText = newFileType === 'image' ? t('admin.campaigns.images') : t('admin.campaigns.videos')
        ElMessage.error(t('admin.campaigns.mediaTypeMutexError', {
          current: currentTypeText,
          new: newTypeText
        }))
        return false
      }
      
      // 检查文件大小
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024 // 视频50MB, 图片5MB
      if (file.size > maxSize) {
        ElMessage.error(t('admin.campaigns.uploadSizeError', {
          size: isVideo ? '50MB' : '5MB'
        }))
        return false
      }
      
      // 检查具体数量限制
      if (newFileType === 'video' && campaignForm.value.media_files.length >= 1) {
        ElMessage.error(t('admin.campaigns.videoLimitError'))
        return false
      }
      
      if (newFileType === 'image' && campaignForm.value.media_files.length >= 3) {
        ElMessage.error(t('admin.campaigns.imageLimitError'))
        return false
      }
      
      return true
    }

    // 多媒体上传成功
    const handleMediaUploadSuccess = (response, file) => {
      if (response.success && response.data.files) {
        // 将上传的文件添加到media_files数组
        campaignForm.value.media_files.push(...response.data.files)
        ElMessage.success(t('admin.campaigns.uploadMediaSuccess'))
      } else {
        ElMessage.error(response.message || t('admin.campaigns.uploadMediaError'))
      }
    }

    // 多媒体上传失败
    const handleMediaUploadError = (error) => {
      console.error('Media upload error:', error)
      ElMessage.error(t('admin.campaigns.uploadMediaError'))
    }

    // 删除上传组件中的文件
    const handleMediaRemove = (file) => {
      // 这个函数处理el-upload组件的文件移除
      console.log('Remove file from upload component:', file)
    }

    // 删除媒体文件
    const removeMediaFile = (index) => {
      campaignForm.value.media_files.splice(index, 1)
      
      // 如果删除后没有文件了，重置类型锁定
      if (campaignForm.value.media_files.length === 0) {
        selectedMediaType.value = null
      }
      
      ElMessage.success(t('admin.campaigns.removeMediaSuccess'))
    }

    // 获取图片URL列表（用于预览）
    const getImageUrls = () => {
      return campaignForm.value.media_files
        .filter(file => file.type === 'image')
        .map(file => file.url)
    }

    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // 获取当前媒体类型
    const getCurrentMediaType = () => {
      if (campaignForm.value.media_files.length > 0) {
        return campaignForm.value.media_files[0].type
      }
      return selectedMediaType.value
    }

    // 获取上传限制数量
    const getUploadLimit = () => {
      const mediaType = getCurrentMediaType()
      if (mediaType === 'video') {
        return 1
      } else if (mediaType === 'image') {
        return 3
      }
      return 3 // 默认最大限制
    }

    // 获取允许的文件类型
    const getAcceptedFileTypes = () => {
      const mediaType = getCurrentMediaType()
      if (mediaType === 'video') {
        return '.mp4,.webm,.ogg,.mov,.avi'
      } else if (mediaType === 'image') {
        return '.jpg,.jpeg,.png,.gif,.webp'
      }
      return baseAcceptedTypes // 默认全部类型
    }

    // 获取是否允许多选
    const getMultipleAllowed = () => {
      const mediaType = getCurrentMediaType()
      return mediaType !== 'video' // 视频不允许多选
    }

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      return new Date(dateString).toLocaleDateString()
    }

    // 获取状态类型
    const getStatusType = (status) => {
      switch (status) {
        case 'active': return 'success'
        case 'inactive': return 'warning'
        case 'expired': return 'danger'
        default: return 'info'
      }
    }

    // 获取状态文本
    const getStatusText = (status) => {
      switch (status) {
        case 'active': return t('admin.campaigns.active')
        case 'inactive': return t('admin.campaigns.inactive')
        case 'expired': return t('admin.campaigns.expired')
        default: return status
      }
    }

    // 券类型选项
    const couponTypes = ref([
      {
        value: 'final_price',
        label: t('admin.campaigns.finalPriceType'),
        example: t('admin.campaigns.finalPriceExample')
      },
      {
        value: 'gift_card',
        label: t('admin.campaigns.giftCardType'),
        example: t('admin.campaigns.giftCardExample')
      },
      {
        value: 'cash_voucher',
        label: t('admin.campaigns.cashVoucherType'),
        example: t('admin.campaigns.cashVoucherExample')
      },
      {
        value: 'full_reduction',
        label: t('admin.campaigns.fullReductionType'),
        example: t('admin.campaigns.fullReductionExample')
      },
      {
        value: 'percentage_discount',
        label: t('admin.campaigns.percentageDiscountType'),
        example: t('admin.campaigns.percentageDiscountExample')
      },
      {
        value: 'fixed_discount',
        label: t('admin.campaigns.fixedDiscountType'),
        example: t('admin.campaigns.fixedDiscountExample')
      }
    ])

    // 处理券类型变化
    const handleCouponTypeChange = (type) => {
      // 清空所有价格字段
      campaignForm.value.original_price = null
      campaignForm.value.discount_price = null
      campaignForm.value.price_final = null
      campaignForm.value.face_value = null
      campaignForm.value.amount_off = null
      campaignForm.value.min_spend = null
      campaignForm.value.discount_percent = null
      campaignForm.value.cap_amount = null
      
      // 更新验证规则
      updateValidationRules(type)
    }

    // 更新验证规则
    const updateValidationRules = (type) => {
      const baseRules = {
        title: [
          { required: true, message: t('admin.campaigns.titleRequired'), trigger: 'blur' }
        ],
        description: [
          { required: true, message: t('admin.campaigns.descriptionRequired'), trigger: 'blur' }
        ],
        coupon_type: [
          { required: true, message: t('admin.campaigns.couponTypeRequired'), trigger: 'change' }
        ],
        quantity: [
          { required: true, message: t('admin.campaigns.quantityRequired'), trigger: 'blur' }
        ],
        valid_from: [
          { required: true, message: t('admin.campaigns.validFromRequired'), trigger: 'change' }
        ],
        valid_to: [
          { required: true, message: t('admin.campaigns.validToRequired'), trigger: 'change' }
        ]
      }

      // 根据券类型添加特定的验证规则
      switch (type) {
        case 'final_price':
          baseRules.price_final = [
            { required: true, message: t('admin.campaigns.finalPriceRequired'), trigger: 'blur' }
          ]
          break
        case 'gift_card':
          baseRules.face_value = [
            { required: true, message: t('admin.campaigns.faceValueRequired'), trigger: 'blur' }
          ]
          break
        case 'cash_voucher':
          baseRules.amount_off = [
            { required: true, message: t('admin.campaigns.amountOffRequired'), trigger: 'blur' }
          ]
          break
        case 'full_reduction':
          baseRules.min_spend = [
            { required: true, message: t('admin.campaigns.minSpendRequired'), trigger: 'blur' }
          ]
          baseRules.amount_off = [
            { required: true, message: t('admin.campaigns.amountOffRequired'), trigger: 'blur' }
          ]
          break
        case 'percentage_discount':
          baseRules.discount_percent = [
            { required: true, message: t('admin.campaigns.discountPercentRequired'), trigger: 'blur' }
          ]
          break
        case 'fixed_discount':
          baseRules.amount_off = [
            { required: true, message: t('admin.campaigns.amountOffRequired'), trigger: 'blur' }
          ]
          break
      }

      Object.assign(formRules.value, baseRules)
    }

    // 生成价格摘要
    const getPriceSummary = (coupon) => {
      // 优先使用后端返回的价格摘要，确保格式一致
      if (coupon.price_summary) {
        return coupon.price_summary
      }
      
      const type = coupon.coupon_type || 'final_price'
      const currency = '฿' // 使用泰铢符号
      
      switch (type) {
        case 'final_price':
          if (coupon.original_price && coupon.discount_price) {
            return `${currency}${coupon.original_price} → ${currency}${coupon.discount_price}`
          }
          return coupon.price_final ? `${currency}${coupon.price_final}` : '价格待定'
          
        case 'gift_card':
          return coupon.face_value ? `面值 ${currency}${coupon.face_value}` : '面值待定'
          
        case 'cash_voucher':
          return coupon.amount_off ? `抵用 ${currency}${coupon.amount_off}` : '抵用金额待定'
          
        case 'full_reduction':
          if (coupon.min_spend && coupon.amount_off) {
            return `满 ${currency}${coupon.min_spend} 减 ${currency}${coupon.amount_off}`
          }
          return '满减条件待定'
          
        case 'percentage_discount':
          if (coupon.discount_percent) {
            const discount = (100 - parseFloat(coupon.discount_percent)) / 10
            let summary = `${discount}折`
            if (coupon.min_spend) {
              summary += ` (满${currency}${coupon.min_spend})`
            }
            if (coupon.cap_amount) {
              summary += ` (最高${currency}${coupon.cap_amount})`
            }
            return summary
          }
          return '折扣待定'
          
        case 'fixed_discount':
          if (coupon.amount_off) {
            let summary = `减 ${currency}${coupon.amount_off}`
            if (coupon.min_spend) {
              summary += ` (满${currency}${coupon.min_spend})`
            }
            return summary
          }
          return '折扣金额待定'
          
        default:
          return '价格待定'
      }
    }

    // 获取券类型标签
    const getCouponTypeLabel = (type) => {
      const typeMap = {
        'final_price': '最终价券',
        'gift_card': '礼品券',
        'cash_voucher': '抵用券',
        'full_reduction': '满减券',
        'percentage_discount': '折扣券',
        'fixed_discount': '固定折扣券'
      }
      return typeMap[type] || '未知类型'
    }

    // 获取主要显示图片 - 仿照详情页逻辑
    const getMainImage = (campaign) => {
      // 首先检查 image_url 字段
      if (campaign.image_url) {
        return campaign.image_url
      }
      
      // 然后检查 media_files 中的第一个图片文件
      if (campaign.media_files && campaign.media_files.length > 0) {
        // 处理可能的JSON字符串格式
        let mediaFiles = campaign.media_files
        if (typeof mediaFiles === 'string') {
          try {
            mediaFiles = JSON.parse(mediaFiles)
          } catch (error) {
            console.error('解析媒体文件数据失败:', error)
            return null
          }
        }
        
        const imageFile = mediaFiles.find(file => file.type === 'image')
        if (imageFile && imageFile.url) {
          return imageFile.url
        }
      }
      
      return null
    }

    onMounted(() => {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin/login')
        return
      }
      
      loadCampaigns()
      loadStores()
      updateValidationRules(campaignForm.value.coupon_type)
    })

    return {
      // 页面状态
      loading,
      submitting,
      searchKeyword,
      statusFilter,
      
      // 分页状态
      currentPage,
      pageSize,
      totalCount,
      
      // 活动数据
      campaignList,
      
      // 添加/编辑
      showAddCampaign,
      editingCampaign,
      campaignForm,
      formRef,
      formRules,
      
      // 券类型系统
      couponTypes,
      handleCouponTypeChange,
      updateValidationRules,
      getPriceSummary,
      getCouponTypeLabel,
      getMainImage,
      
      // 门店数据
      storeList,
      selectedProvince,
      selectedDistrict,
      availableProvinces,
      availableDistricts,
      groupedStores,
      handleProvinceChange,
      handleDistrictChange,
      clearFilters,
      
      // 多媒体上传
      uploadRef,
      fileList,
      selectedMediaType,
      uploadHeaders,
      beforeMediaUpload,
      handleMediaUploadSuccess,
      handleMediaUploadError,
      handleMediaRemove,
      removeMediaFile,
      getImageUrls,
      formatFileSize,
      getUploadLimit,
      getAcceptedFileTypes,
      getMultipleAllowed,
      getCurrentMediaType,
      
      // 方法
      handleSearch,
      handleSizeChange,
      handleCurrentChange,
      editCampaign,
      deleteCampaign,
      saveCampaign,
      resetForm,
      loadStores,
      handleStoreSelection,
      formatDate,
      getStatusType,
      getStatusText,
      
      // 图标
      ArrowLeft,
      Plus,
      Search,
      Edit,
      Delete
    }
  }
})
</script>

<style scoped>
.admin-campaigns {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.campaigns-content {
  padding: 20px;
}

.search-section {
  margin-bottom: 20px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 多媒体上传组件样式 */
.media-upload-section {
  width: 100%;
}

.media-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
}

.media-item {
  position: relative;
  width: 120px;
}

.image-preview,
.video-preview {
  position: relative;
  width: 100px;
  height: 100px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.media-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-preview:hover .media-overlay,
.video-preview:hover .media-overlay {
  opacity: 1;
}

.media-info {
  margin-top: 8px;
  text-align: center;
}

.file-name {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.upload-tips {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #409eff;
}

.upload-tips p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
}

.mutex-tip {
  color: #f56c6c !important;
  font-weight: 500;
  margin-top: 8px !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .campaigns-content {
    padding: 10px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .search-section .el-row {
    flex-direction: column;
  }
  
  .search-section .el-col {
    margin-bottom: 10px;
  }
  
  .media-preview {
    gap: 12px;
  }
  
  .media-item {
    width: 100px;
  }
  
  .image-preview,
  .video-preview {
    width: 80px;
    height: 80px;
  }
}
.field-note {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  line-height: 1.2;
}
</style>