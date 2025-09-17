<template>
  <div class="admin-stores">
    <el-card shadow="never" class="page-header">
      <div class="header-content">
        <div class="header-left">
          <el-button @click="$router.back()" :icon="ArrowLeft">{{ $t('common.back') }}</el-button>
          <h2>{{ $t('admin.menu.storeManagement') }}</h2>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="showAddStore = true" :icon="Plus">
            {{ $t('admin.stores.addStore') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="stores-content">
      <!-- 搜索栏 -->
      <div class="search-section">
        <el-input
          v-model="searchKeyword"
          :placeholder="$t('admin.stores.searchPlaceholder')"
          @input="handleSearch"
          @clear="handleSearch"
          clearable
          style="width: 300px"
          :prefix-icon="Search"
        />
      </div>

      <!-- 门店数据表格 -->
      <el-table 
        :data="storeList" 
        v-loading="loading"
        stripe
        style="width: 100%; margin-top: 20px;"
      >
        <el-table-column type="index" width="50" />
        <el-table-column 
          :label="$t('admin.stores.storeImage')"
          width="100"
          align="center"
        >
          <template #default="scope">
            <el-image 
              v-if="scope.row.image_url"
              :src="scope.row.image_url" 
              style="width: 60px; height: 60px; border-radius: 8px;"
              fit="cover"
              lazy
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
            <div v-else class="no-image">
              <el-icon><Picture /></el-icon>
              <span style="font-size: 12px; color: #999;">无图片</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column 
          prop="name" 
          :label="$t('admin.stores.storeName')"
          min-width="150"
        />
        <el-table-column 
          prop="city" 
          :label="$t('admin.stores.city')"
          width="100"
        />
        <el-table-column 
          prop="address" 
          :label="$t('admin.stores.address')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column 
          prop="rating" 
          :label="$t('admin.stores.rating')"
          width="80"
        >
          <template #default="scope">
            <span v-if="scope.row.rating">{{ scope.row.rating }}⭐</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="phone" 
          :label="$t('admin.stores.phone')"
          width="130"
        />
        <el-table-column 
          prop="lat" 
          :label="$t('admin.stores.latitude')"
          width="100"
        >
          <template #default="scope">
            <span v-if="scope.row.lat">{{ parseFloat(scope.row.lat).toFixed(4) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="lng" 
          :label="$t('admin.stores.longitude')"
          width="100"
        >
          <template #default="scope">
            <span v-if="scope.row.lng">{{ parseFloat(scope.row.lng).toFixed(4) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="code" 
          :label="$t('admin.stores.storeCode')"
          width="120"
        />
        <el-table-column 
          :label="$t('admin.stores.status')"
          width="100"
        >
          <template #default="scope">
            <el-tag 
              :type="scope.row.status === 'active' ? 'success' : 'danger'"
              size="small"
            >
              {{ scope.row.status === 'active' ? $t('admin.stores.active') : $t('admin.stores.inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column 
          :label="$t('admin.stores.actions')"
          width="350"
          fixed="right"
        >
          <template #default="scope">
            <el-button 
              size="small" 
              @click="editStore(scope.row)"
              :icon="Edit"
            >
              {{ $t('admin.stores.edit') }}
            </el-button>
            <el-button 
              size="small" 
              type="primary"
              @click="manageStaffPresets(scope.row)"
              :icon="User"
            >
              {{ $t('admin.stores.manageStaffPresets') }}
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteStore(scope.row)"
              :icon="Delete"
            >
              {{ $t('admin.stores.delete') }}
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

    <!-- 添加/编辑门店对话框 -->
    <el-dialog 
      v-model="showAddStore" 
      :title="editingStore ? $t('admin.stores.editStore') : $t('admin.stores.addStore')"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="storeForm" :rules="formRules" label-width="100px">
        <el-form-item :label="$t('admin.stores.storeName')" prop="name">
          <el-input
            v-model="storeForm.name"
            :placeholder="$t('admin.stores.storeNamePlaceholder')"
          />
        </el-form-item>
        
        <el-form-item :label="$t('admin.stores.address')" prop="address">
          <el-autocomplete
            v-model="storeForm.address"
            :fetch-suggestions="searchPlaces"
            :placeholder="$t('admin.stores.addressPlaceholder')"
            @select="onPlaceSelected"
            style="width: 100%"
            clearable
          >
            <template #default="{ item }">
              <div>
                <div style="font-weight: 500;">{{ item.mainText }}</div>
                <div style="font-size: 12px; color: #999;">{{ item.secondaryText }}</div>
              </div>
            </template>
          </el-autocomplete>
        </el-form-item>
        
        <el-form-item :label="$t('admin.stores.city')" prop="city">
          <el-input
            v-model="storeForm.city"
            :placeholder="$t('admin.stores.cityPlaceholder')"
            readonly
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('admin.stores.latitude')" prop="lat">
              <el-input
                v-model="storeForm.lat"
                :placeholder="$t('admin.stores.latitudePlaceholder')"
                readonly
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('admin.stores.longitude')" prop="lng">
              <el-input
                v-model="storeForm.lng"
                :placeholder="$t('admin.stores.longitudePlaceholder')"
                readonly
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item :label="$t('admin.stores.rating')" prop="rating">
          <el-input
            v-model="storeForm.rating"
            :placeholder="$t('admin.stores.ratingPlaceholder')"
            readonly
          />
        </el-form-item>
        
        <el-form-item :label="$t('admin.stores.phone')" prop="phone">
          <el-input
            v-model="storeForm.phone"
            :placeholder="$t('admin.stores.phonePlaceholder')"
          />
        </el-form-item>
        
        <el-form-item :label="$t('admin.stores.website')" prop="website">
          <el-input
            v-model="storeForm.website"
            :placeholder="$t('admin.stores.websitePlaceholder')"
          />
        </el-form-item>
        
        <el-form-item :label="$t('admin.stores.openingHours')" prop="opening_hours">
          <el-input
            v-model="storeForm.opening_hours"
            type="textarea"
            :rows="3"
            :placeholder="$t('admin.stores.openingHoursPlaceholder')"
            readonly
          />
        </el-form-item>
        
        <el-form-item :label="$t('admin.stores.code')" prop="code">
          <el-input
            v-model="storeForm.code"
            :placeholder="$t('admin.stores.codeGenerated')"
            readonly
            disabled
          />
          <div class="form-tip">{{ $t('admin.stores.codeAutoGenerated') }}</div>
        </el-form-item>
        
        <el-form-item :label="$t('admin.stores.imageUrl')" prop="image_url">
          <div class="simple-image-upload">
            <!-- 显示已上传的图片 -->
            <div v-if="storeForm.image_url" class="uploaded-image">
              <el-image 
                :src="storeForm.image_url" 
                style="width: 100px; height: 100px; border-radius: 8px;"
                fit="cover"
              />
              <div class="image-actions">
                <el-button size="small" type="primary" @click="selectNewImage">更换图片</el-button>
              </div>
            </div>
            
            <!-- 上传按钮 -->
            <div v-else class="upload-area">
              <el-button type="primary" @click="selectNewImage" :loading="uploading">
                <el-icon><Plus /></el-icon>
                选择图片上传
              </el-button>
            </div>
            
            <!-- 隐藏的文件输入 -->
            <input 
              ref="fileInput" 
              type="file" 
              accept="image/*" 
              style="display: none"
              @change="handleFileSelect"
            />
          </div>
        </el-form-item>
        
        <el-form-item :label="$t('admin.stores.status')" prop="status">
          <el-radio-group v-model="storeForm.status">
            <el-radio label="active">{{ $t('admin.stores.active') }}</el-radio>
            <el-radio label="inactive">{{ $t('admin.stores.inactive') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAddStore = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveStore" :loading="submitting">
          {{ $t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 员工预设管理对话框 -->
    <el-dialog 
      v-model="showStaffDialog" 
      :title="$t('admin.stores.manageStaffPresets') + ' - ' + (currentStore?.name || '')"
      width="700px"
      @close="resetStaffForm"
    >
      <div class="staff-management">
        <!-- 现有员工预设列表 -->
        <div v-if="staffPresetList.length > 0" class="existing-staff-presets">
          <h4>{{ $t('admin.stores.existingStaffPresets') }}</h4>
          <div v-for="(staff, index) in staffPresetList" :key="staff.id" class="staff-item">
            <el-card shadow="never" class="staff-card">
              <div class="staff-info">
                <div class="staff-details">
                  <div class="staff-main-info">
                    <span class="staff-name">👤 {{ staff.name }}</span>
                    <span class="staff-id">🆔 工号: {{ staff.staff_id }}</span>
                    <span class="staff-phone" v-if="staff.phone">📱 电话: {{ staff.phone }}</span>
                  </div>
                  <div v-if="staff.bindings && staff.bindings.length > 0" class="binding-info">
                    <el-tag v-for="binding in staff.bindings" :key="binding.binding_id" 
                            type="success" size="small" class="binding-tag">
                      已绑定: {{ binding.display_name }}
                    </el-tag>
                  </div>
                </div>
                <div class="staff-actions">
                  <div class="staff-status">
                    <el-tag 
                      :type="staff.status === 'active' ? 'success' : 'danger'"
                      size="small"
                    >
                      {{ staff.status === 'active' ? $t('admin.stores.active') : $t('admin.stores.inactive') }}
                    </el-tag>
                  </div>
                  <div class="staff-buttons">
                    <el-button 
                      size="small" 
                      type="success"
                      @click="generateStaffBindingQR(staff)"
                      :icon="Connection"
                    >
                      {{ $t('admin.stores.generateBindingQR') }}
                    </el-button>
                    <el-button 
                      size="small" 
                      type="danger" 
                      @click="removeStaffPreset(staff.id)"
                      :icon="Delete"
                    >
                      {{ $t('admin.stores.remove') }}
                    </el-button>
                  </div>
                </div>
              </div>
            </el-card>
          </div>
        </div>

        <!-- 使用说明 -->
        <div class="usage-instructions">
          <el-alert
            :title="$t('admin.stores.staffPresetInstructions')"
            type="info"
            show-icon
            :closable="false"
            style="margin-bottom: 20px;"
          >
            <template #default>
              <div class="instruction-content">
                <p><strong>{{ $t('admin.stores.howStaffPresetWorks') }}</strong></p>
                <ol class="instruction-list">
                  <li>{{ $t('admin.stores.presetStep1') }}</li>
                  <li>{{ $t('admin.stores.presetStep2') }}</li>
                  <li>{{ $t('admin.stores.presetStep3') }}</li>
                </ol>
              </div>
            </template>
          </el-alert>
        </div>

        <!-- 添加新员工预设 -->
        <div class="add-staff-presets">
          <h4>{{ $t('admin.stores.addNewStaffPresets') }}</h4>
          <div 
            v-for="(staff, index) in newStaffPresets" 
            :key="index" 
            class="staff-input-group"
          >
            <el-card shadow="never" class="staff-input-card">
              <el-row :gutter="10">
                <el-col :span="6">
                  <el-input
                    v-model="staff.staff_id"
                    :placeholder="$t('admin.stores.staffIdPlaceholder')"
                    clearable
                    required
                  >
                    <template #prepend>{{ $t('admin.stores.staffId') }}</template>
                  </el-input>
                </el-col>
                <el-col :span="8">
                  <el-input
                    v-model="staff.name"
                    :placeholder="$t('admin.stores.staffNamePlaceholder')"
                    clearable
                    required
                  >
                    <template #prepend>{{ $t('admin.stores.name') }}</template>
                  </el-input>
                </el-col>
                <el-col :span="6">
                  <el-input
                    v-model="staff.phone"
                    :placeholder="$t('admin.stores.staffPhonePlaceholder')"
                    clearable
                    required
                  >
                    <template #prepend>📱 {{ $t('admin.stores.staffPhone') }}</template>
                  </el-input>
                </el-col>
                <el-col :span="4">
                  <el-button 
                    type="danger" 
                    @click="removeNewStaffInput(index)"
                    :icon="Delete"
                    size="small"
                    v-if="newStaffPresets.length > 1"
                  />
                </el-col>
              </el-row>
              
            </el-card>
          </div>
          <el-button 
            type="dashed" 
            @click="addNewStaffInput" 
            :icon="Plus"
            style="width: 100%; margin-top: 10px;"
          >
            {{ $t('admin.stores.addAnotherStaff') }}
          </el-button>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showStaffDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveStaffPresets" :loading="submitting">
          {{ $t('common.save') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 员工绑定二维码对话框 -->
    <el-dialog 
      v-model="showBindingQRDialog" 
      :title="$t('admin.stores.bindingQRTitle')"
      width="500px"
      @close="resetBindingQRDialog"
    >
      <div class="qr-dialog-content">
        <div class="qr-description">
          <el-alert 
            :title="$t('admin.stores.bindingQRDesc')" 
            type="info" 
            show-icon 
            :closable="false"
            style="margin-bottom: 20px;"
          />
        </div>

        <div v-if="qrCodeData" class="qr-display">
          <div class="qr-code-container">
            <img :src="qrCodeData.qrCodeUrl" alt="Binding QR Code" class="qr-image" />
          </div>
          <div class="store-info">
            <h4>{{ selectedStore?.name }}</h4>
            <p>{{ $t('admin.stores.storeCode') }}: {{ selectedStore?.code }}</p>
          </div>
        </div>

        <div v-else-if="generatingQR" class="qr-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <p>{{ $t('common.generating') }}...</p>
        </div>

        <div v-else class="qr-error">
          <el-alert 
            :title="$t('admin.stores.qrGenerateError')" 
            type="error" 
            show-icon 
            :closable="false"
          />
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showBindingQRDialog = false">{{ $t('common.close') }}</el-button>
          <el-button v-if="qrCodeData" type="success" @click="downloadQRCode" :icon="Download">
            {{ $t('admin.stores.downloadQR') }}
          </el-button>
          <el-button v-if="qrCodeData" type="primary" @click="shareToLine" :icon="Share">
            {{ $t('admin.stores.shareToLine') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.image-slot {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 60px;
  background: #f5f7fa;
  border-radius: 8px;
  color: #909399;
}

.no-image {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 60px;
  background: #f5f7fa;
  border-radius: 8px;
  color: #909399;
}

.no-image .el-icon {
  font-size: 20px;
  margin-bottom: 4px;
}
</style>

<script>
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Search, Edit, Delete, User, Picture, Camera, Connection, Loading, Download, Share } from '@element-plus/icons-vue'
import axios from 'axios'
import { adminApi } from '../api/admin'

export default defineComponent({
  name: 'AdminStores',
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    
    // 页面状态
    const loading = ref(false)
    const submitting = ref(false)
    const searchKeyword = ref('')
    
    // 分页状态
    const currentPage = ref(1)
    const pageSize = ref(20)
    const totalCount = ref(0)
    
    // 门店列表
    const storeList = ref([])
    
    // 添加/编辑门店
    const showAddStore = ref(false)
    const editingStore = ref(null)
    const formRef = ref()

    // 员工预设管理
    const showStaffDialog = ref(false)
    const currentStore = ref(null)
    const staffPresetList = ref([])
    const newStaffPresets = ref([{ 
      staff_id: '', 
      name: '', 
      phone: '',
      department: '', 
      position: ''
    }])
    const uploadRef = ref()

    // 二维码生成对话框
    const showBindingQRDialog = ref(false)
    const generatingQR = ref(false)
    const qrCodeData = ref(null)
    const selectedStore = ref(null)
    const storeForm = ref({
      name: '',
      address: '',
      code: '',
      image_url: '',
      status: 'active',
      city: '',
      lat: null,
      lng: null,
      rating: null,
      phone: '',
      website: '',
      opening_hours: '',
      google_place_id: ''
    })

    // 上传状态
    const uploading = ref(false)
    const fileInput = ref(null)

    // 表单验证规则
    const formRules = {
      name: [
        { required: true, message: t('admin.stores.storeNameRequired'), trigger: 'blur' }
      ],
      address: [
        { required: true, message: t('admin.stores.addressRequired'), trigger: 'blur' }
      ]
      // 门店编码不再需要验证，因为是自动生成的
    }

    // 获取门店列表
    const loadStores = async () => {
      try {
        loading.value = true
        
        const response = await adminApi.getStores({
          page: currentPage.value,
          limit: pageSize.value,
          search: searchKeyword.value
        })

        if (response.success) {
          storeList.value = response.data
          totalCount.value = response.pagination.total
        }
      } catch (error) {
        console.error('加载门店列表失败:', error)
        if (error.response?.status === 401) {
          router.push('/admin/login')
        } else {
          ElMessage.error(t('admin.stores.loadError'))
        }
      } finally {
        loading.value = false
      }
    }

    // 搜索
    const handleSearch = () => {
      currentPage.value = 1
      loadStores()
    }

    // 分页大小改变
    const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
      loadStores()
    }

    // 当前页改变
    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
      loadStores()
    }

    // 编辑门店
    const editStore = (store) => {
      editingStore.value = store
      storeForm.value = { ...store }
      showAddStore.value = true
    }

    // 删除门店
    const deleteStore = async (store) => {
      try {
        await ElMessageBox.confirm(
          t('admin.stores.deleteConfirmMessage', { name: store.name }),
          t('admin.stores.deleteConfirmTitle'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning',
          }
        )
        
        const token = localStorage.getItem('admin_token')
        await axios.delete(`/api/admin/stores/${store.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        ElMessage.success(t('admin.stores.deleteSuccess'))
        loadStores()
      } catch (error) {
        if (error === 'cancel' || error === 'close') {
          // 用户取消删除
          return
        }
        console.error('删除门店失败:', error)
        ElMessage.error(t('admin.stores.deleteError'))
      }
    }

    // 府编码映射 (จังหวัด Province)
    const provinceCodeMap = {
      'Krung Thep Maha Nakhon': 'BK',  // 曼谷特别行政区
      'Bangkok': 'BK',                 // 曼谷（英文）
      'Chiang Mai': 'CM',              // 清迈府
      'Phuket': 'PK',                  // 普吉府  
      'Chon Buri': 'CB',               // 春武里府（芭提雅所在）
      'Prachuap Khiri Khan': 'PK',     // 巴蜀府（华欣所在）
      'Krabi': 'KB',                   // 甲米府
      'Surat Thani': 'ST',             // 素叻他尼府（苏梅岛所在）
      'Ayutthaya': 'AY',               // 大城府
      'Rayong': 'RY',                  // 罗勇府
      'Nakhon Ratchasima': 'NR',       // 呵叻府
      'Udon Thani': 'UD',              // 乌隆府
      'Khon Kaen': 'KK',               // 孔敬府
      'Songkhla': 'SK',                // 宋卡府（合艾所在）
      'Nonthaburi': 'NB',              // 暖武里府
      'Pathum Thani': 'PT',            // 巴吞他尼府
    }

    // 生成6位门店编码: [府2位][县/区2位][顺序2位]
    const generateStoreCode = async () => {
      try {
        const address = storeForm.value.address || ''
        
        // 1. 提取府名 (จังหวัด) - 通常在地址最后
        let provinceCode = 'XX' // 默认值
        for (const [provinceName, code] of Object.entries(provinceCodeMap)) {
          if (address.includes(provinceName)) {
            provinceCode = code
            break
          }
        }

        // 2. 提取县/区名 (อำเภอ/เขต)
        let districtCode = '01' // 默认值
        
        // 曼谷特殊处理：提取เขต后的区名
        if (provinceCode === 'BK') {
          const districtMatch = address.match(/(?:Khet|เขต)\s+([^,]+)/i)
          if (districtMatch) {
            const districtName = districtMatch[1].trim()
            // 基于区名生成2位数字编码
            const hash = districtName.split('').reduce((a, b) => {
              a = ((a << 5) - a) + b.charCodeAt(0)
              return a & a
            }, 0)
            districtCode = String(Math.abs(hash) % 99 + 1).padStart(2, '0')
          }
        } else {
          // 其他府：提取อำเภอ后的县名
          const districtMatch = address.match(/(?:อำเภอ|Amphoe|District)\s+([^,]+)/i)
          if (districtMatch) {
            const districtName = districtMatch[1].trim()
            const hash = districtName.split('').reduce((a, b) => {
              a = ((a << 5) - a) + b.charCodeAt(0)
              return a & a
            }, 0)
            districtCode = String(Math.abs(hash) % 99 + 1).padStart(2, '0')
          }
        }

        // 3. 获取该府县的门店数量作为顺序码
        const token = localStorage.getItem('admin_token')
        const response = await axios.get('/api/admin/stores/count', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            province_code: provinceCode,
            district_code: districtCode
          }
        })

        let sequenceCode = '01'
        if (response.data.success) {
          const count = response.data.count || 0
          sequenceCode = String(count + 1).padStart(2, '0')
        }

        const finalCode = `${provinceCode}${districtCode}${sequenceCode}`
        console.log(`生成门店编码: ${finalCode} (府:${provinceCode}, 县/区:${districtCode}, 序号:${sequenceCode})`)
        
        return finalCode
      } catch (error) {
        console.error('生成门店编码失败:', error)
        // 降级方案：使用时间戳
        const timestamp = Date.now().toString().slice(-6)
        return timestamp
      }
    }

    // 选择新图片
    const selectNewImage = () => {
      fileInput.value.click()
    }

    // 处理文件选择
    const handleFileSelect = async (event) => {
      const file = event.target.files[0]
      if (!file) return
      
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        ElMessage.error('请选择图片文件')
        return
      }
      
      // 检查文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        ElMessage.error('图片大小不能超过5MB')
        return
      }
      
      try {
        uploading.value = true
        console.log('📤 开始上传图片:', file.name)
        
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await axios.post('/api/admin/upload/simple-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        console.log('✅ 上传响应:', response.data)
        
        if (response.data.success) {
          storeForm.value.image_url = response.data.url
          ElMessage.success('图片上传成功')
          console.log('✅ 图片URL已设置:', response.data.url)
        } else {
          ElMessage.error(response.data.message || '上传失败')
        }
      } catch (error) {
        console.error('❌ 上传失败:', error)
        ElMessage.error('图片上传失败')
      } finally {
        uploading.value = false
        // 清空文件输入
        event.target.value = ''
      }
    }


    // 保存门店
    const saveStore = async () => {
      // 验证表单
      const valid = await formRef.value.validate().catch(() => false)
      if (!valid) return

      try {
        submitting.value = true
        
        // 如果是新增门店且没有编码，自动生成
        if (!editingStore.value && !storeForm.value.code) {
          storeForm.value.code = await generateStoreCode()
        }
        
        const token = localStorage.getItem('admin_token')
        const method = editingStore.value ? 'put' : 'post'
        const url = editingStore.value 
          ? `/api/admin/stores/${editingStore.value.id}`
          : '/api/admin/stores'

        await axios[method](url, storeForm.value, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        ElMessage.success(editingStore.value ? t('admin.stores.updateSuccess') : t('admin.stores.addSuccess'))
        showAddStore.value = false
        resetForm()
        loadStores()
      } catch (error) {
        console.error('保存门店失败:', error)
        ElMessage.error(editingStore.value ? t('admin.stores.updateError') : t('admin.stores.addError'))
      } finally {
        submitting.value = false
      }
    }

    // Google Places搜索
    const searchPlaces = async (queryString, callback) => {
      if (!queryString || queryString.length < 2) {
        callback([])
        return
      }

      try {
        const token = localStorage.getItem('admin_token')
        const response = await axios.get('/api/admin/places/autocomplete', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            input: queryString
          }
        })

        if (response.data.success) {
          callback(response.data.data)
        } else {
          callback([])
        }
      } catch (error) {
        console.error('Places搜索失败:', error)
        callback([])
      }
    }

    // 选择地点
    const onPlaceSelected = async (place) => {
      try {
        const token = localStorage.getItem('admin_token')
        const response = await axios.get('/api/admin/places/details', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            placeId: place.placeId
          }
        })

        if (response.data.success) {
          const details = response.data.data
          
          // 自动填充表单
          storeForm.value.name = storeForm.value.name || details.name
          storeForm.value.address = details.address
          storeForm.value.city = details.city
          storeForm.value.lat = details.lat
          storeForm.value.lng = details.lng
          storeForm.value.rating = details.rating
          storeForm.value.phone = details.phone
          storeForm.value.website = details.website
          storeForm.value.google_place_id = details.placeId
          
          // 格式化营业时间
          if (details.openingHours && details.openingHours.weekdayText) {
            storeForm.value.opening_hours = details.openingHours.weekdayText.join('\n')
          }

          ElMessage.success(t('admin.stores.placeSelectedSuccess'))
        }
      } catch (error) {
        console.error('获取地点详情失败:', error)
        ElMessage.error(t('admin.stores.placeDetailsError'))
      }
    }

    // 重置表单
    const resetForm = () => {
      editingStore.value = null
      storeForm.value = {
        name: '',
        address: '',
        code: '',
        image_url: '',
        status: 'active',
        city: '',
        lat: null,
        lng: null,
        rating: null,
        phone: '',
        website: '',
        opening_hours: '',
        google_place_id: ''
      }
    }

    // 员工预设管理相关方法
    const manageStaffPresets = async (store) => {
      currentStore.value = store
      showStaffDialog.value = true
      await loadStaffPresets(store.id)
    }

    // 加载指定门店的员工预设列表
    const loadStaffPresets = async (storeId) => {
      try {
        const response = await adminApi.getStaffPresets(storeId)

        if (response.success) {
          staffPresetList.value = response.data
        }
      } catch (error) {
        console.error('加载员工预设列表失败:', error)
        ElMessage.error(t('admin.stores.loadStaffPresetsError'))
      }
    }

    // 保存员工预设
    const saveStaffPresets = async () => {
      try {
        submitting.value = true
        
        // 过滤并转换有效的新员工预设数据
        const validNewStaff = newStaffPresets.value
          .filter(s => {
            // 检查必填字段
            return s.staff_id && s.staff_id.trim() !== '' && 
                   s.name && s.name.trim() !== '' &&
                   s.phone && s.phone.trim() !== ''
          })
          .map(s => ({
            staff_id: s.staff_id.trim(),
            name: s.name.trim(),
            phone: s.phone.trim(),
            department: s.department ? s.department.trim() : null,
            position: s.position ? s.position.trim() : null
          }))

        if (validNewStaff.length === 0) {
          ElMessage.warning(t('admin.stores.noValidStaffPresets'))
          return
        }

        await adminApi.addStaffPresets(currentStore.value.id, validNewStaff)

        ElMessage.success(t('admin.stores.staffPresetsAddSuccess'))
        
        // 重新加载员工预设列表
        await loadStaffPresets(currentStore.value.id)
        
        // 重置新员工预设表单
        resetStaffForm()
        
      } catch (error) {
        console.error('保存员工预设失败:', error)
        if (error.response?.data?.message) {
          ElMessage.error(error.response.data.message)
        } else {
          ElMessage.error(t('admin.stores.saveStaffPresetsError'))
        }
      } finally {
        submitting.value = false
      }
    }

    // 移除员工预设
    const removeStaffPreset = async (presetId) => {
      try {
        await ElMessageBox.confirm(
          t('admin.stores.removeStaffPresetConfirm'),
          t('admin.stores.removeStaffPresetTitle'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning',
          }
        )
        
        await adminApi.deleteStaffPreset(presetId)
        
        ElMessage.success(t('admin.stores.staffPresetRemoveSuccess'))
        
        // 重新加载员工预设列表
        await loadStaffPresets(currentStore.value.id)
        
      } catch (error) {
        if (error === 'cancel' || error === 'close') {
          return
        }
        console.error('移除员工预设失败:', error)
        ElMessage.error(t('admin.stores.removeStaffPresetError'))
      }
    }

    // 添加新的员工预设输入框
    const addNewStaffInput = () => {
      newStaffPresets.value.push({ 
        staff_id: '', 
        name: '', 
        phone: '',
        department: '', 
        position: ''
      })
    }

    // 移除员工预设输入框
    const removeNewStaffInput = (index) => {
      if (newStaffPresets.value.length > 1) {
        newStaffPresets.value.splice(index, 1)
      }
    }

    // 重置员工预设表单
    const resetStaffForm = () => {
      newStaffPresets.value = [{ 
        staff_id: '', 
        name: '', 
        phone: '',
        department: '', 
        position: ''
      }]
      staffPresetList.value = []
      currentStore.value = null
    }

    // 生成员工绑定二维码（针对单个员工）
    const generateStaffBindingQR = async (staff) => {
      try {
        selectedStore.value = currentStore.value
        showBindingQRDialog.value = true
        generatingQR.value = true
        qrCodeData.value = null

        // 调用后端API生成二维码
        const response = await adminApi.generateStoreBindingQR(currentStore.value.id)
        
        if (response.success) {
          qrCodeData.value = response.data // 保存完整的data对象，包含qrCodeUrl和bindingUrl
          ElMessage.success(`${staff.name} 的绑定二维码生成成功`)
        } else {
          throw new Error(response.message || '生成二维码失败')
        }
      } catch (error) {
        console.error('生成绑定二维码失败:', error)
        ElMessage.error(t('admin.stores.qrGenerateError'))
        qrCodeData.value = null
      } finally {
        generatingQR.value = false
      }
    }

    // 重置二维码对话框
    const resetBindingQRDialog = () => {
      qrCodeData.value = null
      generatingQR.value = false
      selectedStore.value = null
    }

    // 下载二维码
    const downloadQRCode = () => {
      if (!qrCodeData.value) return
      
      const link = document.createElement('a')
      link.href = qrCodeData.value.qrCodeUrl
      link.download = `${selectedStore.value?.name || 'store'}-binding-qr.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      ElMessage.success('二维码下载成功')
    }

    // 分享到LINE
    const shareToLine = () => {
      if (!qrCodeData.value) return
      
      const storeName = selectedStore.value?.name || '门店'
      const shareText = `${storeName} 员工绑定二维码\n\n扫描二维码绑定员工身份：`
      const bindingUrl = qrCodeData.value.bindingUrl
      const fullMessage = `${shareText}\n${bindingUrl}`
      
      // 检测设备类型
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)
      
      if (isMobile) {
        // 移动端：使用LINE深度链接
        const lineShareUrl = `https://line.me/R/share?text=${encodeURIComponent(fullMessage)}`
        
        if (isIOS || isAndroid) {
          // 直接跳转到LINE应用
          window.location.href = lineShareUrl
          ElMessage.success('正在打开LINE应用...')
        } else {
          // 其他移动设备，在新窗口打开
          window.open(lineShareUrl, '_blank')
          ElMessage.success('已打开LINE分享')
        }
      } else {
        // 桌面端：由于LINE不支持桌面深度链接，提供替代方案
        
        // 方法1：尝试复制到剪贴板
        if (navigator.clipboard) {
          navigator.clipboard.writeText(fullMessage).then(() => {
            ElMessage({
              type: 'success',
              message: '绑定信息已复制到剪贴板！请在LINE中粘贴分享给员工',
              duration: 4000
            })
          }).catch(() => {
            showDesktopShareFallback(fullMessage)
          })
        } else {
          showDesktopShareFallback(fullMessage)
        }
      }
    }
    
    // 桌面端分享回退方案
    const showDesktopShareFallback = (message) => {
      // 创建一个临时文本区域来复制文本
      const textarea = document.createElement('textarea')
      textarea.value = message
      document.body.appendChild(textarea)
      textarea.select()
      
      try {
        document.execCommand('copy')
        ElMessage({
          type: 'success', 
          message: '绑定信息已复制！请在LINE中粘贴分享给员工',
          duration: 4000
        })
      } catch (err) {
        ElMessage({
          type: 'info',
          message: '请手动复制二维码链接分享给员工',
          duration: 3000
        })
        
        // 选中文本供用户复制
        textarea.select()
        textarea.setSelectionRange(0, 99999) // 移动端
      }
      
      // 清理临时元素
      setTimeout(() => {
        document.body.removeChild(textarea)
      }, 1000)
    }

    onMounted(() => {
      // 检查管理员登录状态
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin/login')
        return
      }
      
      // 尝试加载数据，如果token过期会被拦截器处理
      loadStores()
    })

    return {
      // 页面状态
      loading,
      submitting,
      searchKeyword,
      
      // 分页状态
      currentPage,
      pageSize,
      totalCount,
      
      // 门店数据
      storeList,
      
      // 添加/编辑
      showAddStore,
      editingStore,
      storeForm,
      formRef,
      formRules,
      
      // 员工预设管理
      showStaffDialog,
      currentStore,
      staffPresetList,
      newStaffPresets,
      
      // 二维码生成
      showBindingQRDialog,
      generatingQR,
      qrCodeData,
      selectedStore,
      
      // 方法
      handleSearch,
      handleSizeChange,
      handleCurrentChange,
      editStore,
      deleteStore,
      saveStore,
      resetForm,
      searchPlaces,
      onPlaceSelected,
      
      // 员工预设管理方法
      manageStaffPresets,
      loadStaffPresets,
      saveStaffPresets,
      removeStaffPreset,
      addNewStaffInput,
      removeNewStaffInput,
      resetStaffForm,
      
      // 二维码相关方法
      generateStaffBindingQR,
      resetBindingQRDialog,
      downloadQRCode,
      shareToLine,
      
      // 图片上传
      uploading,
      fileInput,
      selectNewImage,
      handleFileSelect,
      
      // 图标
      ArrowLeft,
      Plus,
      Search,
      Edit,
      Delete,
      User,
      Picture,
      Camera,
      Connection,
      Loading,
      Download,
      Share
    }
  }
})
</script>

<style scoped>
.admin-stores {
  min-height: 100vh;
  background: #f5f5f5;
}

.stores-content {
  padding: 10px;
}

.search-section {
  margin-bottom: 10px;
}

.stores-list {
  background: white;
  border-radius: 8px;
}

.store-item {
  border-bottom: 1px solid #eee;
}

.store-item:last-child {
  border-bottom: none;
}

.store-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.add-store-form {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.add-store-form .van-form {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

/* 员工预设管理样式 */
.staff-management {
  max-height: 60vh;
  overflow-y: auto;
}

.existing-staff-presets {
  margin-bottom: 20px;
}

.existing-staff-presets h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-weight: 600;
}

.staff-item {
  margin-bottom: 10px;
}

.staff-card {
  border: 1px solid #ebeef5;
}

.staff-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.staff-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.staff-name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.staff-id {
  color: #909399;
  font-size: 12px;
}

.staff-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  min-width: 200px;
}

.staff-status {
  display: flex;
  justify-content: flex-end;
}

.staff-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.staff-buttons .el-button {
  margin: 0;
}

.add-staff-presets h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-weight: 600;
}

.staff-input-group {
  margin-bottom: 10px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .stores-content {
    padding: 5px;
  }
  
  .store-actions {
    flex-direction: column;
    gap: 5px;
  }

  .staff-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .staff-actions {
    justify-content: flex-end;
    width: 100%;
  }
  .form-tip {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
  }

  .store-image-uploader {
    width: 100%;
  }

  .uploaded-image {
    position: relative;
    display: inline-block;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    overflow: hidden;
  }

  .uploaded-image:hover .image-overlay {
    opacity: 1;
  }

  .image-overlay {
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

  .upload-placeholder {
    width: 100px;
    height: 100px;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.3s ease;
  }

  .upload-placeholder:hover {
    border-color: #409eff;
  }

  .upload-icon {
    font-size: 24px;
    color: #d9d9d9;
    margin-bottom: 8px;
  }

  .upload-text {
    font-size: 12px;
    color: #999;
    text-align: center;
  }
}
</style>