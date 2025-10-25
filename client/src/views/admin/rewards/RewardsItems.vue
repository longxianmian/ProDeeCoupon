<template>
  <div class="rewards-items-page">
    <!-- 面包屑导航 -->
    <el-breadcrumb separator="/" class="breadcrumb">
      <el-breadcrumb-item :to="{ path: '/admin/dashboard' }">{{ $t('admin.menu.dashboard') }}</el-breadcrumb-item>
      <el-breadcrumb-item>{{ $t('admin.menu.business') }}</el-breadcrumb-item>
      <el-breadcrumb-item>{{ $t('admin.menu.rewardsManagement') }}</el-breadcrumb-item>
      <el-breadcrumb-item>{{ $t('admin.menu.rewardsItems') }}</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()" circle>
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h2>{{ $t('admin.menu.rewardsItems') }}</h2>
      </div>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        新建商品
      </el-button>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="商品类型">
          <el-select v-model="filterType" placeholder="全部类型" style="width: 150px">
            <el-option label="全部类型" value="" />
            <el-option label="券" value="coupon" />
            <el-option label="虚拟商品" value="virtual" />
            <el-option label="实物" value="physical" />
            <el-option label="礼包" value="bundle" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterStatus" placeholder="全部状态" style="width: 150px">
            <el-option label="全部状态" value="" />
            <el-option label="草稿" value="draft" />
            <el-option label="待审" value="review" />
            <el-option label="上线" value="live" />
            <el-option label="下线" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadItems">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="items" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="商品信息" min-width="300">
          <template #default="{ row }">
            <div class="item-info">
              <el-image 
                :src="row.cover || '/default-reward.png'" 
                fit="cover" 
                style="width: 60px; height: 60px; margin-right: 12px" 
              />
              <div>
                <div class="item-title">{{ row.title }}</div>
                <el-tag size="small">{{ getTypeLabel(row.type) }}</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="支付方式" width="150">
          <template #default="{ row }">
            <div v-if="getPaymentType(row) === 'points'" class="payment-type">
              <el-tag type="primary" size="small">💎 {{ row.points_cost }}积分</el-tag>
            </div>
            <div v-else-if="getPaymentType(row) === 'cash'" class="payment-type">
              <el-tag type="success" size="small">฿{{ parseFloat(row.cash_price).toFixed(2) }}</el-tag>
            </div>
            <div v-else class="payment-type-hybrid">
              <el-tag type="success" size="small">฿{{ parseFloat(row.cash_price).toFixed(2) }}</el-tag>
              <span class="plus">+</span>
              <el-tag type="primary" size="small">💎{{ row.points_cost }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ getCategoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="100">
          <template #default="{ row }">
            <span :class="{ 'stock-low': row.stock !== null && row.stock < 10 }">
              {{ row.stock === null ? '无限' : row.stock }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination
        v-if="pagination.total > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        @current-change="loadItems"
        @size-change="loadItems"
        layout="total, sizes, prev, pager, next"
        :page-sizes="[10, 20, 50, 100]"
        class="pagination"
      />
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" :rules="formRules" ref="formRef" label-width="120px">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="basic">
            <el-form-item label="商品类型" prop="type">
              <el-select v-model="formData.type" placeholder="请选择商品类型">
                <el-option label="券" value="coupon" />
                <el-option label="虚拟商品" value="virtual" />
                <el-option label="实物" value="physical" />
                <el-option label="礼包" value="bundle" />
              </el-select>
            </el-form-item>

            <el-form-item label="商品标题" prop="title">
              <el-input v-model="formData.title" placeholder="请输入商品标题（中文）" />
            </el-form-item>

            <el-form-item label="商品描述">
              <el-input
                v-model="formData.description"
                type="textarea"
                :rows="4"
                placeholder="请输入商品描述（中文）"
              />
            </el-form-item>

            <el-form-item label="商品图片">
              <div class="images-upload-container">
                <div class="images-upload-tip">
                  <el-alert type="info" :closable="false">
                    请上传3-8张商品图片，第一张将作为封面图展示
                  </el-alert>
                </div>
                
                <div class="images-list">
                  <div 
                    v-for="(imageUrl, index) in formData.images" 
                    :key="imageUrl"
                    class="image-item"
                  >
                    <img :src="imageUrl" class="image-preview" />
                    <div class="image-overlay">
                      <el-icon class="image-action" @click="handlePreviewImage(imageUrl)"><ZoomIn /></el-icon>
                      <el-icon class="image-action" @click="handleRemoveImage(index)"><Delete /></el-icon>
                    </div>
                    <div v-if="index === 0" class="cover-badge">封面</div>
                  </div>
                </div>

                <el-upload
                  v-if="formData.images.length < 8"
                  class="image-uploader"
                  action="/api/upload"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="handleImageSuccess"
                  :before-upload="beforeUpload"
                  :disabled="uploading"
                >
                  <div class="upload-box">
                    <el-icon class="upload-icon" v-if="!uploading"><Plus /></el-icon>
                    <el-icon class="upload-icon is-loading" v-else><Loading /></el-icon>
                    <div class="upload-text">{{ uploading ? '上传中...' : '添加图片' }}</div>
                  </div>
                </el-upload>
              </div>
            </el-form-item>

            <el-form-item label="积分价格" prop="points_cost">
              <el-input-number v-model="formData.points_cost" :min="0" />
            </el-form-item>

            <el-form-item label="商品分类" prop="category">
              <el-select v-model="formData.category" placeholder="请选择商品分类">
                <el-option label="推荐" value="recommended" />
                <el-option label="穿搭" value="fashion" />
                <el-option label="美食" value="food" />
                <el-option label="美护" value="beauty" />
                <el-option label="家居" value="home" />
                <el-option label="3C" value="electronics" />
                <el-option label="亲子" value="kids" />
                <el-option label="教育" value="education" />
              </el-select>
            </el-form-item>

            <el-form-item label="现金价格">
              <el-input-number v-model="formData.cash_price" :min="0" :precision="2" />
              <span class="form-tip">选填，用于混合支付（现金+积分）或纯现金购买</span>
            </el-form-item>

            <el-form-item label="成本价">
              <el-input-number v-model="formData.cost" :min="0" :precision="2" />
              <span class="form-tip">运营人员可见</span>
            </el-form-item>

            <el-form-item label="库存数量">
              <el-input-number v-model="formData.stock" :min="0" />
              <span class="form-tip">留空表示无限库存</span>
            </el-form-item>

            <el-form-item label="库存预警">
              <el-input-number v-model="formData.stock_alert" :min="0" />
            </el-form-item>

            <el-form-item label="状态">
              <el-select v-model="formData.status">
                <el-option label="草稿" value="draft" />
                <el-option label="待审核" value="review" />
                <el-option label="上线" value="live" />
                <el-option label="下线" value="archived" />
              </el-select>
            </el-form-item>

            <el-form-item label="排序">
              <el-input-number v-model="formData.sort_order" :min="0" />
              <span class="form-tip">数值越大越靠前</span>
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="多语言" name="i18n">
            <el-alert
              title="多语言提示"
              type="info"
              :closable="false"
              style="margin-bottom: 20px"
            >
              请先在"基本信息"填写中文内容，然后点击"自动翻译"按钮生成英文和泰文版本
            </el-alert>

            <el-button
              type="primary"
              @click="handleTranslate"
              :loading="translating"
              style="margin-bottom: 20px"
            >
              <el-icon><Promotion /></el-icon>
              自动翻译
            </el-button>

            <el-divider content-position="left">中文</el-divider>
            <el-form-item label="标题（中文）">
              <el-input v-model="formData.title_zh_cn" placeholder="自动从基本信息同步" readonly />
            </el-form-item>
            <el-form-item label="描述（中文）">
              <el-input v-model="formData.description_zh_cn" type="textarea" :rows="3" readonly />
            </el-form-item>

            <el-divider content-position="left">English</el-divider>
            <el-form-item label="Title (EN)">
              <el-input v-model="formData.title_en_us" placeholder="Click translate button" />
            </el-form-item>
            <el-form-item label="Description (EN)">
              <el-input v-model="formData.description_en_us" type="textarea" :rows="3" />
            </el-form-item>

            <el-divider content-position="left">ภาษาไทย</el-divider>
            <el-form-item label="ชื่อเรื่อง (TH)">
              <el-input v-model="formData.title_th_th" placeholder="คลิกปุ่มแปล" />
            </el-form-item>
            <el-form-item label="คำอธิบาย (TH)">
              <el-input v-model="formData.description_th_th" type="textarea" :rows="3" />
            </el-form-item>
          </el-tab-pane>
        </el-tabs>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Promotion, ZoomIn, Delete, Loading, ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'

export default defineComponent({
  name: 'RewardsItems',
  setup() {
    const items = ref([])
    const loading = ref(false)
    const uploading = ref(false)
    const filterType = ref('')
    const filterStatus = ref('')
    const dialogVisible = ref(false)
    const dialogTitle = computed(() => formData.id ? '编辑商品' : '新建商品')
    const activeTab = ref('basic')
    const submitting = ref(false)
    const translating = ref(false)
    const formRef = ref(null)
    const previewImageUrl = ref('')
    const previewVisible = ref(false)
    
    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    })

    const formData = reactive({
      id: null,
      type: 'coupon',
      title: '',
      title_zh_cn: '',
      title_en_us: '',
      title_th_th: '',
      description: '',
      description_zh_cn: '',
      description_en_us: '',
      description_th_th: '',
      cover: '',
      images: [],
      category: 'recommended',
      points_cost: 100,
      cash_price: null,
      cost: null,
      stock: null,
      stock_alert: 10,
      status: 'draft',
      sort_order: 0
    })

    const formRules = {
      type: [{ required: true, message: '请选择商品类型', trigger: 'change' }],
      title: [{ required: true, message: '请输入商品标题', trigger: 'blur' }],
      points_cost: [{ required: true, message: '请输入积分价格', trigger: 'blur' }]
    }

    const uploadHeaders = computed(() => ({
      'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
    }))

    const loadItems = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit
        }
        if (filterType.value) params.type = filterType.value
        if (filterStatus.value) params.status = filterStatus.value
        
        const token = localStorage.getItem('admin_token')
        const { data } = await axios.get('/api/rewards/admin/items', { 
          params,
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        items.value = data.data || []
        if (data.pagination) {
          pagination.total = data.pagination.total
        }
      } catch (error) {
        console.error('加载商品列表失败:', error)
        ElMessage.error(error.response?.data?.message || '加载商品列表失败')
      } finally {
        loading.value = false
      }
    }

    const handleCreate = () => {
      Object.assign(formData, {
        id: null,
        type: 'coupon',
        title: '',
        title_zh_cn: '',
        title_en_us: '',
        title_th_th: '',
        description: '',
        description_zh_cn: '',
        description_en_us: '',
        description_th_th: '',
        cover: '',
        images: [],
        category: 'recommended',
        points_cost: 100,
        cash_price: null,
        cost: null,
        stock: null,
        stock_alert: 10,
        status: 'draft',
        sort_order: 0
      })
      activeTab.value = 'basic'
      dialogVisible.value = true
    }

    const handleEdit = async (row) => {
      try {
        const token = localStorage.getItem('admin_token')
        const { data } = await axios.get(`/api/rewards/admin/items/${row.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const item = data.data
        // 处理images字段（数据库返回的可能是JSON字符串或数组）
        if (item.images && typeof item.images === 'string') {
          item.images = JSON.parse(item.images)
        }
        if (!Array.isArray(item.images)) {
          item.images = []
        }
        Object.assign(formData, item)
        activeTab.value = 'basic'
        dialogVisible.value = true
      } catch (error) {
        ElMessage.error('加载商品详情失败')
      }
    }

    const handleDelete = async (row) => {
      try {
        await ElMessageBox.confirm(
          '确定要删除该商品吗？如果商品已有兑换记录，将无法删除。',
          '删除确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const token = localStorage.getItem('admin_token')
        await axios.delete(`/api/rewards/admin/items/${row.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        ElMessage.success('删除成功')
        loadItems()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || '删除失败')
        }
      }
    }

    const handleImageSuccess = (response, uploadFile, uploadFiles) => {
      uploading.value = false
      
      if (response && response.success && response.url) {
        // 直接使用push方法触发响应式更新
        formData.images.push(response.url)
        
        // 第一张图自动作为封面
        if (formData.images.length === 1) {
          formData.cover = response.url
        }
        ElMessage.success('图片上传成功')
      } else {
        ElMessage.error(response?.message || '图片上传失败')
      }
    }

    const handleRemoveImage = (index) => {
      formData.images.splice(index, 1)
      // 始终同步封面为第一张图片
      formData.cover = formData.images.length > 0 ? formData.images[0] : ''
    }

    const handlePreviewImage = (url) => {
      window.open(url, '_blank')
    }

    const beforeUpload = (file) => {
      const isImage = file.type.startsWith('image/')
      const isLt2M = file.size / 1024 / 1024 < 2

      if (!isImage) {
        ElMessage.error('只能上传图片文件!')
        return false
      }
      if (!isLt2M) {
        ElMessage.error('图片大小不能超过 2MB!')
        return false
      }
      uploading.value = true
      return true
    }

    const handleTranslate = async () => {
      if (!formData.title) {
        ElMessage.warning('请先填写商品标题')
        return
      }

      translating.value = true
      try {
        const token = localStorage.getItem('admin_token')
        
        // 先同步中文字段
        formData.title_zh_cn = formData.title
        formData.description_zh_cn = formData.description
        
        // 如果是编辑模式且已有ID，调用翻译接口
        if (formData.id) {
          const { data } = await axios.post(
            `/api/rewards/admin/items/${formData.id}/translate`,
            {},
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          
          // 更新表单数据
          formData.title_en_us = data.data.title_en_us
          formData.title_th_th = data.data.title_th_th
          formData.description_en_us = data.data.description_en_us
          formData.description_th_th = data.data.description_th_th
        } else {
          // 新建模式，调用即时翻译接口
          const { data } = await axios.post(
            '/api/translation/translate-content',
            {
              title: formData.title,
              description: formData.description
            },
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          
          formData.title_en_us = data.data.title_en_us
          formData.title_th_th = data.data.title_th_th
          formData.description_en_us = data.data.description_en_us
          formData.description_th_th = data.data.description_th_th
        }
        
        ElMessage.success('翻译完成')
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '翻译失败')
      } finally {
        translating.value = false
      }
    }

    const handleSubmit = async () => {
      try {
        await formRef.value.validate()
        
        // 验证至少上传了一张图片
        if (!formData.images || formData.images.length === 0) {
          ElMessage.warning('请至少上传一张商品图片')
          return
        }
        
        // 同步中文字段
        formData.title_zh_cn = formData.title
        formData.description_zh_cn = formData.description
        
        // 确保第一张图片作为封面
        formData.cover = formData.images[0]
        
        submitting.value = true
        const token = localStorage.getItem('admin_token')
        
        if (formData.id) {
          // 更新
          await axios.put(
            `/api/rewards/admin/items/${formData.id}`,
            formData,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          ElMessage.success('更新成功')
        } else {
          // 创建
          await axios.post(
            '/api/rewards/admin/items',
            formData,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          ElMessage.success('创建成功')
        }
        
        dialogVisible.value = false
        loadItems()
      } catch (error) {
        if (error.response) {
          ElMessage.error(error.response.data.message || '操作失败')
        }
      } finally {
        submitting.value = false
      }
    }

    const getTypeLabel = (type) => {
      const map = { coupon: '券', virtual: '虚拟', physical: '实物', bundle: '礼包' }
      return map[type] || type
    }

    const getStatusLabel = (status) => {
      const map = { draft: '草稿', review: '待审', live: '上线', archived: '下线' }
      return map[status] || status
    }

    const getStatusType = (status) => {
      const map = { draft: 'info', review: 'warning', live: 'success', archived: 'danger' }
      return map[status] || ''
    }

    const getPaymentType = (item) => {
      const hasPoints = item.points_cost && item.points_cost > 0
      const hasCash = item.cash_price && parseFloat(item.cash_price) > 0
      
      if (hasPoints && hasCash) return 'hybrid'
      if (hasCash) return 'cash'
      return 'points'
    }

    const getCategoryLabel = (category) => {
      const map = {
        recommended: '推荐',
        fashion: '穿搭',
        food: '美食',
        beauty: '美护',
        home: '家居',
        electronics: '3C',
        kids: '亲子',
        education: '教育'
      }
      return map[category] || '推荐'
    }

    onMounted(() => {
      loadItems()
    })

    return {
      items,
      loading,
      uploading,
      filterType,
      filterStatus,
      pagination,
      dialogVisible,
      dialogTitle,
      activeTab,
      formData,
      formRules,
      formRef,
      submitting,
      translating,
      uploadHeaders,
      loadItems,
      handleCreate,
      handleEdit,
      handleDelete,
      handleImageSuccess,
      handleRemoveImage,
      handlePreviewImage,
      beforeUpload,
      handleTranslate,
      handleSubmit,
      getTypeLabel,
      getStatusLabel,
      getStatusType,
      getPaymentType,
      getCategoryLabel,
      Plus,
      Promotion,
      ZoomIn,
      Delete,
      Loading,
      ArrowLeft
    }
  }
})
</script>

<style scoped>
.rewards-items-page {
  padding: 20px;
}

.breadcrumb {
  margin-bottom: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #262626;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.item-info {
  display: flex;
  align-items: center;
}

.item-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.payment-type {
  display: flex;
  align-items: center;
  gap: 4px;
}

.payment-type-hybrid {
  display: flex;
  align-items: center;
  gap: 4px;
}

.payment-type-hybrid .plus {
  font-size: 12px;
  color: #666;
  font-weight: bold;
}

.stock-low {
  color: #ff4d4f;
  font-weight: 600;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.avatar-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.avatar-uploader:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
  line-height: 178px;
}

.avatar {
  width: 178px;
  height: 178px;
  display: block;
}

.form-tip {
  margin-left: 10px;
  color: #999;
  font-size: 12px;
}

.images-upload-container {
  width: 100%;
}

.images-upload-tip {
  margin-bottom: 16px;
}

.images-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.image-item {
  position: relative;
  width: 120px;
  height: 120px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.image-action {
  font-size: 20px;
  color: white;
  cursor: pointer;
  transition: transform 0.2s;
}

.image-action:hover {
  transform: scale(1.2);
}

.cover-badge {
  position: absolute;
  top: 0;
  left: 0;
  background: #409eff;
  color: white;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 0 0 6px 0;
}

.image-uploader {
  display: inline-block;
}

.upload-box {
  width: 120px;
  height: 120px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-box:hover {
  border-color: #409eff;
}

.upload-icon {
  font-size: 28px;
  color: #8c939d;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
  color: #8c939d;
}
</style>
