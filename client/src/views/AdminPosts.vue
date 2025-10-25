<template>
  <div class="admin-posts">
    <!-- 返回按钮 -->
    <el-button 
      type="primary" 
      @click="goBack" 
      style="margin-bottom: 16px;"
      size="small"
    >
      <el-icon><ArrowLeft /></el-icon>
      {{ $t('admin.posts.backButton') }}
    </el-button>
    
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">{{ $t('admin.posts.title') }}</h2>
        <p class="page-subtitle">{{ $t('admin.posts.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <!-- 语言切换 -->
        <el-dropdown @command="handleLanguageChange" style="margin-right: 12px;">
          <el-button>
            <el-icon><SwitchButton /></el-icon>
            {{ currentLanguageText }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="zh-cn">🇨🇳 中文</el-dropdown-item>
              <el-dropdown-item command="en-us">🇺🇸 English</el-dropdown-item>
              <el-dropdown-item command="th-th">🇹🇭 ไทย</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          {{ $t('admin.posts.create') }}
        </el-button>
      </div>
    </div>

    <!-- 筛选和搜索栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <el-select v-model="filters.status" @change="handleFilterChange" class="filter-select">
          <el-option :label="$t('admin.posts.allStatus')" value="all" />
          <el-option :label="$t('admin.posts.statusDraft')" value="draft" />
          <el-option :label="$t('admin.posts.statusPublished')" value="published" />
          <el-option :label="$t('admin.posts.statusArchived')" value="archived" />
        </el-select>
        
        <el-select v-model="filters.type" @change="handleFilterChange" class="filter-select">
          <el-option :label="$t('admin.posts.allTypes')" value="all" />
          <el-option :label="$t('admin.posts.typeVideo')" value="video" />
          <el-option :label="$t('admin.posts.typeArticle')" value="article" />
        </el-select>
      </div>
      
      <div class="filter-right">
        <el-input
          v-model="filters.search"
          :placeholder="$t('admin.posts.searchPlaceholder')"
          @input="handleSearchInput"
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>


    <!-- 批量操作栏 -->
    <div class="batch-bar" v-if="selectedPosts.length > 0">
      <div class="batch-info">
        {{ $t('admin.posts.selectedCount', { count: selectedPosts.length }) }}
      </div>
      <div class="batch-actions">
        <el-button type="danger" size="small" @click="batchDelete">
          <el-icon><Delete /></el-icon>
          {{ $t('admin.posts.batchDelete') }}
        </el-button>
        <el-button type="success" size="small" @click="openBatchBindDialog">
          <el-icon><Link /></el-icon>
          {{ $t('admin.posts.batchBind') }}
        </el-button>
        <el-button size="small" @click="clearSelection">
          {{ $t('admin.posts.cancelSelection') }}
        </el-button>
      </div>
    </div>

    <!-- 内容列表 -->
    <el-table
      ref="postsTableRef"
      v-loading="loading"
      :data="posts"
      class="posts-table"
      @selection-change="handleSelectionChange"
    >
      <!-- 多选框列 -->
      <el-table-column type="selection" width="55" />
      
      <el-table-column :label="$t('admin.posts.titleColumn')" min-width="200">
        <template #default="{ row }">
          <div class="post-title">
            <el-tag v-if="row.type === 'video'" type="danger" size="small">
              <el-icon><VideoCamera /></el-icon>
              {{ $t('admin.posts.typeVideo') }}
            </el-tag>
            <el-tag v-else type="primary" size="small">
              <el-icon><Document /></el-icon>
              {{ $t('admin.posts.typeArticle') }}
            </el-tag>
            <div class="title-text">{{ row.title }}</div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column :label="$t('admin.posts.statusColumn')" width="120">
        <template #default="{ row }">
          <el-tag
            :type="getStatusTagType(row.status)"
            size="small"
          >
            {{ $t(`admin.posts.status${row.status.charAt(0).toUpperCase() + row.status.slice(1)}`) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column :label="$t('admin.posts.mediaColumn')" width="100">
        <template #default="{ row }">
          <div class="media-preview" v-if="row.media_files && row.media_files.length > 0">
            <img
              v-if="row.media_files[0].type === 'image'"
              :src="row.media_files[0].url"
              class="media-thumb"
              @error="handleImageError"
            />
            <div v-else class="video-thumb">
              <el-icon><VideoCamera /></el-icon>
            </div>
            <span v-if="row.media_files.length > 1" class="media-count">
              +{{ row.media_files.length - 1 }}
            </span>
          </div>
          <span v-else class="no-media">—</span>
        </template>
      </el-table-column>
      
      <el-table-column :label="$t('admin.posts.createdAtColumn')" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      
      <el-table-column :label="$t('admin.posts.publishedAtColumn')" width="180">
        <template #default="{ row }">
          {{ row.published_at ? formatDate(row.published_at) : '—' }}
        </template>
      </el-table-column>
      
      <!-- 新增列：活动绑定信息 -->
      <el-table-column :label="$t('admin.posts.activityColumn')" min-width="160">
        <template #default="{ row }">
          <el-tag v-if="row.activity_id" type="success" effect="light" size="small">
            <el-icon><Promotion /></el-icon>
            {{ row.activity_name || row.activity_title || ('#' + row.activity_id) }}
          </el-tag>
          <span v-else style="color:#bbb">{{ $t('admin.posts.notBound') }}</span>
        </template>
      </el-table-column>

      <!-- 新增列：CTA 简要 -->
      <el-table-column label="CTA" width="120">
        <template #default="{ row }">
          <span>
            {{ row.cta_text || (row.cta_type === 'coupon' ? $t('admin.posts.ctaClaimNow') : (row.cta_type === 'groupbuy' || row.cta_type === 'group_buy') ? $t('admin.posts.ctaJoinNow') : (row.cta_type ? $t('admin.posts.ctaViewDetails') : '-')) }}
          </span>
        </template>
      </el-table-column>

      <!-- 统计数据列 -->
      <el-table-column :label="$t('admin.posts.statsColumn')" width="200">
        <template #default="{ row }">
          <div class="stats-cell">
            <div class="stat-item">
              <el-icon><View /></el-icon>
              <span>{{ row.views_count || 0 }}</span>
            </div>
            <div class="stat-item">
              <el-icon><Star /></el-icon>
              <span>{{ row.likes_count || 0 }}</span>
            </div>
            <div class="stat-item">
              <el-icon><ChatDotRound /></el-icon>
              <span>{{ row.comments_count || 0 }}</span>
            </div>
            <div class="stat-item conversion" v-if="row.conversions_count">
              <el-icon><TrendCharts /></el-icon>
              <span>{{ row.conversion_rate || 0 }}%</span>
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column :label="$t('admin.posts.actionsColumn')" width="280" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="openEditDialog(row)">
            <el-icon><Edit /></el-icon>
            {{ $t('admin.posts.edit') }}
          </el-button>
          <el-button 
            v-if="row.activity_id && row.activity_id > 0" 
            type="warning" 
            size="small" 
            @click="openSingleUnbindDialog(row)"
          >
            <el-icon><CircleClose /></el-icon>
            {{ $t('admin.posts.unbindButton') }}
          </el-button>
          <el-button 
            v-else
            type="success" 
            size="small" 
            @click="openSingleBindDialog(row)"
          >
            <el-icon><Link /></el-icon>
            {{ $t('admin.posts.bindButton') }}
          </el-button>
          <el-button type="danger" size="small" @click="confirmDelete(row)">
            <el-icon><Delete /></el-icon>
            {{ $t('admin.posts.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handlePaginationChange"
        @current-change="handlePaginationChange"
      />
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? $t('admin.posts.createDialog') : $t('admin.posts.editDialog')"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="postFormRef"
        :model="postForm"
        :rules="formRules"
        label-width="120px"
        class="post-form"
      >
        <el-form-item :label="$t('admin.posts.typeLabel')" prop="type">
          <el-radio-group v-model="postForm.type">
            <el-radio value="article">
              <el-icon><Document /></el-icon>
              {{ $t('admin.posts.typeArticle') }}
            </el-radio>
            <el-radio value="video">
              <el-icon><VideoCamera /></el-icon>
              {{ $t('admin.posts.typeVideo') }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="$t('admin.posts.titleLabel')" prop="title">
          <el-input v-model="postForm.title" :placeholder="$t('admin.posts.titlePlaceholder')" />
        </el-form-item>

        <el-form-item :label="$t('admin.posts.contentLabel')" prop="content">
          <div class="rich-editor-wrapper">
            <QuillEditor
              v-model:content="postForm.content"
              contentType="html"
              theme="snow"
              :toolbar="[
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'header': [1, 2, 3, false] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['blockquote'],
                ['link'],
                ['clean']
              ]"
              :placeholder="$t('admin.posts.contentPlaceholder')"
            />
          </div>
          <p class="upload-tip" style="margin-top: 8px; color: #909399; font-size: 12px;">
            💡 支持富文本格式：加粗、斜体、标题、列表、链接等。注意：图片和视频请在上方"图片素材"中上传。
          </p>
        </el-form-item>

        <!-- 视频类型：只上传视频文件（系统自动使用视频首帧作为缩略图） -->
        <template v-if="postForm.type === 'video'">
          <el-form-item :label="$t('admin.posts.videoFileLabel')">
            <FileUploader
              v-model="fileList"
              accept="video/*"
              :max-size="50 * 1024 * 1024"
              :max-files="1"
              ref="fileUploaderRef"
              @upload-success="handleUploadSuccess"
              @upload-error="handleUploadError"
            />
            <p class="upload-tip">{{ $t('admin.posts.videoFileTip') }}</p>
            <p class="upload-tip" style="color: #67C23A;">
              💡 {{ $t('admin.posts.videoAutoThumbTip') }}
            </p>
          </el-form-item>
        </template>

        <!-- 图文类型：只允许图片 -->
        <el-form-item v-else :label="$t('admin.posts.imagesLabel')">
          <FileUploader
            v-model="fileList"
            accept="image/*"
            :max-size="5 * 1024 * 1024"
            :max-files="9"
            ref="fileUploaderRef"
            @upload-success="handleUploadSuccess"
            @upload-error="handleUploadError"
          />
          <p class="upload-tip">{{ $t('admin.posts.imagesTip') }}</p>
        </el-form-item>

        <!-- 新增：定时发布时间 -->
        <el-form-item :label="$t('admin.posts.publishAtLabel')" prop="publish_at">
          <el-date-picker
            v-model="postForm.publish_at"
            type="datetime"
            :placeholder="$t('admin.posts.publishAtPlaceholder')"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>

        <el-form-item :label="$t('admin.posts.statusLabel')" prop="status">
          <el-radio-group v-model="postForm.status">
            <el-radio value="draft">{{ $t('admin.posts.statusDraft') }}</el-radio>
            <el-radio value="published">{{ $t('admin.posts.statusPublished') }}</el-radio>
            <el-radio value="archived">{{ $t('admin.posts.statusArchived') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">{{ $t('admin.posts.cancel') }}</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ dialogMode === 'create' ? $t('admin.posts.create') : $t('admin.posts.update') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 绑定活动对话框 -->
    <el-dialog v-model="bindDialogVisible" :title="currentPost ? $t('admin.posts.bindDialogTitleWithPost', { title: currentPost.title }) : $t('admin.posts.bindDialogTitle')" width="520px">
      <el-form :model="bindForm" label-width="96px">
        <el-form-item :label="$t('admin.posts.selectActivity')">
          <el-select v-model="bindForm.activity_id" filterable :placeholder="$t('admin.posts.activityPlaceholder')" @visible-change="visible => visible && loadActs()">
            <el-option
              v-for="a in actOptions"
              :key="a.id"
              :label="actLabel(a)"
              :value="a.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('admin.posts.buttonType')">
          <el-select v-model="bindForm.cta_type">
            <el-option :label="$t('admin.posts.buttonTypeAuto')" value="auto" />
            <el-option :label="$t('admin.posts.buttonTypeCoupon')" value="coupon" />
            <el-option :label="$t('admin.posts.buttonTypeGroupbuy')" value="groupbuy" />
            <el-option :label="$t('admin.posts.buttonTypeDetail')" value="detail" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('admin.posts.buttonText')">
          <el-input v-model="bindForm.cta_text" :placeholder="$t('admin.posts.buttonTextPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('admin.posts.buttonLink')">
          <el-input v-model="bindForm.cta_link" :placeholder="$t('admin.posts.buttonLinkPlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindDialogVisible=false">{{ $t('admin.posts.bindCancel') }}</el-button>
        <el-button type="primary" :disabled="!bindForm.activity_id" @click="confirmBind">{{ $t('admin.posts.bindConfirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, Edit, Delete, Search, VideoCamera, Document, UploadFilled, ArrowLeft, SwitchButton, ArrowDown,
  View, Star, ChatDotRound, TrendCharts, Link, CircleClose, Promotion
} from '@element-plus/icons-vue'
import { adminApi } from '../api/admin.js'
import FileUploader from '../components/FileUploader.vue'
import { useI18n } from 'vue-i18n'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

export default {
  name: 'AdminPosts',
  components: {
    FileUploader,
    QuillEditor,
    Plus, Edit, Delete, Search, VideoCamera, Document, UploadFilled, ArrowLeft, SwitchButton, ArrowDown,
    View, Star, ChatDotRound, TrendCharts, Link
  },
  setup() {
    const { t, locale } = useI18n()
    
    // 语言切换相关 - 使用全局i18n的locale值
    const currentLanguage = computed(() => locale.value)
    
    const currentLanguageText = computed(() => {
      const languageMap = {
        'zh-cn': '🇨🇳 中文',
        'en-us': '🇺🇸 English',
        'th-th': '🇹🇭 ไทย'
      }
      return languageMap[locale.value] || '🇨🇳 中文'
    })
    
    const handleLanguageChange = (lang) => {
      locale.value = lang
      // 同步保存到多个localStorage键，确保全局一致
      localStorage.setItem('language', lang)
      localStorage.setItem('user-language', lang)
      localStorage.setItem('language-explicitly-set', 'true')
      ElMessage.success(t('common.languageChanged'))
    }
    
    const loading = ref(false)
    const posts = ref([])
    const currentPost = ref(null) // 当前操作的单个内容
    const dialogVisible = ref(false)
    const dialogMode = ref('create')
    const submitting = ref(false)
    const postFormRef = ref()
    const uploadRef = ref()
    const fileList = ref([])
    const fileUploaderRef = ref(null)
    const uploadedFiles = ref([])

    // —— 批量操作 ——
    const selectedPosts = ref([])
    const postsTableRef = ref(null)
    
    const handleSelectionChange = (selection) => {
      selectedPosts.value = selection
    }
    
    const clearSelection = () => {
      selectedPosts.value = []
      if (postsTableRef.value) {
        postsTableRef.value.clearSelection()
      }
    }

    // —— 绑定活动弹窗 ——
    const bindDialogVisible = ref(false)
    const bindForm = reactive({ activity_id: null, cta_type: 'auto', cta_text: '', cta_link: '' })

    const filters = reactive({
      status: 'all',
      type: 'all',
      search: ''
    })

    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    })

    const postForm = reactive({
      id: null,
      type: 'article',
      title: '',
      content: '',
      status: 'draft',
      media_files: [],
      // 新增：定时发布时间
      publish_at: ''
    })

    // 活动下拉数据
    const actOptions = ref([])
    function actLabel(a){
      const tag = a.status === 'draft' ? t('admin.posts.activityDraft') : (a.status === 'active' ? t('admin.posts.activityActive') : '')
      return `${tag}${a.title || a.name || t('admin.posts.activityUntitled')}(#${a.id})`
    }
    async function onActDrop(show){ if(!show) return; await loadActs() }
    async function loadActs(){
      try {
        const data = await adminApi.listActivities({ page:1, pageSize:50 })
        const list = data.data || data || []
        actOptions.value = list
      } catch(e){ console.warn('load activities failed', e) }
    }

    // 打开单个内容的绑定对话框
    function openSingleBindDialog(post) {
      currentPost.value = post
      // 如果已有绑定信息，预填充表单
      if (post.activity_id) {
        bindForm.activity_id = post.activity_id
        bindForm.cta_type = post.cta_type || 'auto'
        bindForm.cta_text = post.cta_text || ''
        bindForm.cta_link = post.cta_link || ''
      } else {
        // 重置表单
        bindForm.activity_id = null
        bindForm.cta_type = 'auto'
        bindForm.cta_text = ''
        bindForm.cta_link = ''
      }
      bindDialogVisible.value = true
      loadActs()
    }

    // 打开单个内容的取消绑定确认对话框
    async function openSingleUnbindDialog(post) {
      try {
        await ElMessageBox.confirm(
          t('admin.posts.unbindConfirmMessage', { title: post.title }),
          t('admin.posts.unbindConfirmTitle'),
          {
            confirmButtonText: t('admin.posts.unbindConfirm'),
            cancelButtonText: t('admin.posts.unbindCancel'),
            type: 'warning',
          }
        )
        await adminApi.unbindPostsActivity({ post_ids: [post.id] })
        ElMessage.success(t('admin.posts.unbindSuccess'))
        fetchPosts()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('取消绑定失败:', error)
          ElMessage.error(t('admin.posts.unbindFailed'))
        }
      }
    }

    async function confirmBind() {
      try {
        let post_ids = []
        
        // 判断是单个还是批量操作
        if (currentPost.value) {
          post_ids = [currentPost.value.id]
        } else if (selectedPosts.value.length > 0) {
          post_ids = selectedPosts.value.map(p => p.id)
        } else {
          return
        }
        
        const payload = { post_ids, ...bindForm }
        // 将 auto 归一化为 null，由后端按活动类型解析
        if (payload.cta_type === 'auto') payload.cta_type = null
        
        await adminApi.bindPostsActivity(payload)
        
        const successMsg = post_ids.length === 1 
          ? t('admin.posts.bindSuccess') 
          : t('admin.posts.batchBindSuccess', { count: post_ids.length })
        
        ElMessage.success(successMsg)
        bindDialogVisible.value = false
        
        // 复位
        currentPost.value = null
        clearSelection()
        bindForm.activity_id = null
        bindForm.cta_type = 'auto'
        bindForm.cta_text = ''
        bindForm.cta_link = ''
        
        fetchPosts()
      } catch (error) {
        console.error('绑定活动失败:', error)
        ElMessage.error(t('admin.posts.bindFailed'))
      }
    }


    // 搜索防抖
    let searchTimeout = null

    const formRules = {
      type: [
        { required: true, message: t('admin.posts.typeRequired'), trigger: 'change' }
      ],
      title: [
        { required: true, message: t('admin.posts.titleRequired'), trigger: 'blur' },
        { min: 1, max: 200, message: t('admin.posts.titleLength'), trigger: 'blur' }
      ],
      status: [
        { required: true, message: t('admin.posts.statusRequired'), trigger: 'change' }
      ]
    }

    // 获取内容列表
    const fetchPosts = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          __ts: Date.now(), // 缓存清除时间戳
          ...filters
        }
        
        const token = localStorage.getItem('admin_token')
        const response = await fetch('/api/posts/admin?' + new URLSearchParams(params), {
          cache: 'no-store', // 禁用缓存
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        
        // 处理认证错误
        if (response.status === 401 || (data.error && data.error.includes('token'))) {
          console.log('🔑 Token已过期，清除本地数据并跳转登录页')
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
          window.location.replace('/admin/login')
          return
        }
        
        if (data.success) {
          posts.value = data.data.posts
          pagination.total = data.data.pagination.total
        } else {
          throw new Error(data.error || t('admin.posts.fetchPostsFailed'))
        }
      } catch (error) {
        console.error('获取内容列表失败:', error)
        ElMessage.error(error.message)
      } finally {
        loading.value = false
      }
    }

    // 筛选变化
    const handleFilterChange = () => {
      pagination.page = 1
      fetchPosts()
    }

    // 搜索输入处理
    const handleSearchInput = () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
      searchTimeout = setTimeout(() => {
        pagination.page = 1
        fetchPosts()
      }, 500)
    }

    // 分页变化
    const handlePaginationChange = () => {
      fetchPosts()
    }

    // 打开创建对话框
    const openCreateDialog = () => {
      dialogMode.value = 'create'
      resetForm()
      dialogVisible.value = true
    }

    // 打开编辑对话框
    const openEditDialog = (row) => {
      dialogMode.value = 'edit'
      Object.assign(postForm, {
        id: row.id,
        type: row.type,
        title: row.title,
        content: row.content || '',
        status: row.status,
        media_files: row.media_files || [],
        publish_at: row.publish_at || ''
      })
      
      // 设置文件列表用于显示已有文件
      fileList.value = (row.media_files || []).map(file => ({
        name: file.originalName || file.filename,
        url: file.url,
        uid: Date.now() + Math.random(),
        status: 'success'
      }))
      
      dialogVisible.value = true
    }

    // 重置表单
    const resetForm = () => {
      // 清空文件列表
      fileList.value = []
      uploadedFiles.value = []

      Object.assign(postForm, {
        id: null,
        type: 'article',
        title: '',
        content: '',
        status: 'draft',
        media_files: [],
        publish_at: ''
      })
      fileList.value = []
      if (postFormRef.value) {
        postFormRef.value.clearValidate()
      }
    }

    // 上传成功处理
    const handleUploadSuccess = (uploadResults) => {
      console.log('上传成功:', uploadResults)
      uploadedFiles.value = uploadResults
      ElMessage.success(t('admin.posts.uploadSuccessCount', { count: uploadResults.length }))
    }

    // 上传错误处理
    const handleUploadError = (error) => {
      console.error('上传失败:', error)
      ElMessage.error(t('admin.posts.uploadFailedRetry'))
    }

    // 提交表单
    const handleSubmit = () => {
      postFormRef.value.validate(async (valid) => {
        if (!valid) return

        submitting.value = true
        try {
          // 先上传文件
          if (fileUploaderRef.value && fileList.value.length > 0) {
            await fileUploaderRef.value.uploadFiles()
          }
          
          // 准备请求数据（视频类型系统会自动使用视频首帧作为缩略图）
          const requestData = {
            type: postForm.type,
            title: postForm.title,
            content: postForm.content,
            status: postForm.status,
            media_files: uploadedFiles.value,
            publish_at: postForm.publish_at
          }

          const token = localStorage.getItem('admin_token')
          const url = dialogMode.value === 'create' 
            ? '/api/posts/admin' 
            : `/api/posts/admin/${postForm.id}`
          
          const response = await fetch(url, {
            method: dialogMode.value === 'create' ? 'POST' : 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
          })

          const data = await response.json()
          if (data.success) {
            ElMessage.success(data.message)
            
            dialogVisible.value = false
            // 创建成功后清空文件列表
            fileList.value = []
            uploadedFiles.value = []
            fetchPosts()
          } else {
            throw new Error(data.error)
          }
        } catch (error) {
          console.error('操作失败:', error)
          if (error.name === 'AbortError') {
            ElMessage.error(t('admin.posts.uploadTimeout'))
          } else if (error.message.includes('fetch')) {
            ElMessage.error(t('admin.posts.networkError'))
          } else {
            ElMessage.error(error.message || t('admin.posts.uploadFailed'))
          }
        } finally {
          submitting.value = false
        }
      })
    }

    // 删除确认
    const confirmDelete = (row) => {
      ElMessageBox.confirm(
        t('admin.posts.deleteConfirmMessage', { title: row.title }),
        t('admin.posts.deleteConfirmTitle'),
        {
          confirmButtonText: t('admin.posts.deleteConfirmButton'),
          cancelButtonText: t('admin.posts.deleteCancelButton'),
          type: 'warning'
        }
      ).then(() => {
        deletePost(row.id)
      })
    }

    // 删除内容
    const deletePost = async (id) => {
      try {
        const token = localStorage.getItem('admin_token')
        const response = await fetch(`/api/posts/admin/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()
        if (data.success) {
          ElMessage.success(t('admin.posts.deleteSuccess'))
          fetchPosts()
        } else {
          throw new Error(data.error)
        }
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error(error.message || t('admin.posts.deleteFailed'))
      }
    }

    // 批量删除
    const batchDelete = async () => {
      if (selectedPosts.value.length === 0) return

      try {
        await ElMessageBox.confirm(
          t('admin.posts.batchDeleteConfirmMessage', { count: selectedPosts.value.length }),
          t('admin.posts.batchDeleteConfirmTitle'),
          {
            confirmButtonText: t('admin.posts.deleteConfirmButton'),
            cancelButtonText: t('admin.posts.deleteCancelButton'),
            type: 'warning'
          }
        )

        const token = localStorage.getItem('admin_token')
        const ids = selectedPosts.value.map(p => p.id)
        
        const response = await fetch('/api/posts/admin/batch', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids })
        })

        const data = await response.json()
        if (data.success) {
          ElMessage.success(t('admin.posts.batchDeleteSuccess', { count: ids.length }))
          clearSelection()
          fetchPosts()
        } else {
          throw new Error(data.error)
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量删除失败:', error)
          ElMessage.error(error.message || t('admin.posts.batchDeleteFailed'))
        }
      }
    }

    // 打开批量绑定对话框
    const openBatchBindDialog = () => {
      if (selectedPosts.value.length === 0) return
      currentPost.value = null // 批量操作清空单个post
      bindForm.activity_id = null
      bindForm.cta_type = 'auto'
      bindForm.cta_text = ''
      bindForm.cta_link = ''
      bindDialogVisible.value = true
      loadActs()
    }

    // 状态标签类型
    const getStatusTagType = (status) => {
      const types = {
        draft: 'info',
        published: 'success', 
        archived: 'warning'
      }
      return types[status] || 'info'
    }

    // 格式化日期
    const formatDate = (dateStr) => {
      if (!dateStr) return '—'
      return new Date(dateStr).toLocaleString('zh-CN')
    }

    // 图片错误处理
    const handleImageError = (e) => {
      e.target.style.display = 'none'
    }

    // 返回功能
    const goBack = () => {
      // 优先使用浏览器历史记录返回
      if (window.history.length > 1) {
        window.history.back()
      } else {
        // 如果没有历史记录，返回管理后台首页
        window.location.href = '/admin'
      }
    }

    onMounted(() => {
      // 检查管理员登录状态
      const token = localStorage.getItem('admin_token')
      if (!token) {
        console.log('🔒 未找到token，跳转登录页')
        window.location.replace('/admin/login')
        return
      }
      
      fetchPosts()
    })

    return {
      // 语言切换
      currentLanguage,
      currentLanguageText,
      handleLanguageChange,
      // 其他
      loading,
      posts,
      filters,
      pagination,
      dialogVisible,
      dialogMode,
      submitting,
      postForm,
      postFormRef,
      fileUploaderRef,
      uploadRef,
      fileList,
      uploadedFiles,
      formRules,
      bindDialogVisible,
      bindForm,
      actOptions,
      actLabel,
      onActDrop,
      loadActs,
      openSingleBindDialog,
      openSingleUnbindDialog,
      confirmBind,
      currentPost,
      fetchPosts,
      handleFilterChange,
      handleSearchInput,
      handlePaginationChange,
      openCreateDialog,
      openEditDialog,
      resetForm,
      handleUploadSuccess,
      handleUploadError,
      handleSubmit,
      confirmDelete,
      getStatusTagType,
      formatDate,
      handleImageError,
      goBack,
      // 批量操作
      selectedPosts,
      postsTableRef,
      handleSelectionChange,
      clearSelection,
      batchDelete,
      openBatchBindDialog
    }
  }
}
</script>

<style scoped>
.admin-posts {
  padding: 24px;
}

.rich-editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.rich-editor-wrapper :deep(.ql-container) {
  min-height: 200px;
  font-size: 14px;
}

.rich-editor-wrapper :deep(.ql-editor) {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}

.rich-editor-wrapper :deep(.ql-toolbar) {
  border-bottom: 1px solid #dcdfe6;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.page-subtitle {
  color: #6b7280;
  margin: 0;
}

.title-with-back {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  font-size: 14px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.back-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.title-section {
  display: flex;
  flex-direction: column;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.filter-left {
  display: flex;
  gap: 12px;
}

.filter-select {
  width: 150px;
}

.search-input {
  width: 300px;
}

.batch-bar {
  background: #f3f4f6;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.batch-info {
  font-weight: 500;
  color: #374151;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.sel-hint { 
  color: #999; 
  margin-left: 6px; 
}

.posts-table {
  margin-bottom: 24px;
}

.post-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-text {
  font-weight: 500;
}

.media-preview {
  position: relative;
  display: inline-block;
}

.media-thumb {
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.video-thumb {
  width: 60px;
  height: 40px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #6b7280;
}

.media-count {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 8px;
  line-height: 1;
}

.no-media {
  color: #9ca3af;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.post-form .el-form-item {
  margin-bottom: 20px;
}

.media-upload {
  width: 100%;
}

.dialog-footer {
  text-align: right;
}

.stats-cell {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
}

.stat-item .el-icon {
  font-size: 14px;
}

.stat-item.conversion {
  color: #67c23a;
  font-weight: 500;
}
</style>