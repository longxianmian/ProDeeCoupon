<template>
  <div class="comment-management">
    <el-card class="header-card">
      <div class="header-content">
        <div class="header-left">
          <el-button @click="goBack" style="margin-right: 16px;">
            <el-icon><ArrowLeft /></el-icon>
            {{ $t('common.back') }}
          </el-button>
          <h2>{{ $t('admin.comments.title') }}</h2>
        </div>
      </div>
      <p class="subtitle">{{ $t('admin.comments.subtitle') }}</p>
    </el-card>

    <el-card class="filter-card">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            :placeholder="$t('admin.comments.searchPlaceholder')"
            clearable
            @clear="fetchComments"
            @keyup.enter="fetchComments"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="statusFilter"
            :placeholder="$t('admin.comments.statusFilter')"
            clearable
            @change="fetchComments"
          >
            <el-option :label="$t('admin.comments.allStatus')" value="" />
            <el-option :label="$t('admin.comments.pending')" value="pending" />
            <el-option :label="$t('admin.comments.approved')" value="approved" />
            <el-option :label="$t('admin.comments.rejected')" value="rejected" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="postFilter"
            :placeholder="$t('admin.comments.postFilter')"
            filterable
            clearable
            @change="fetchComments"
          >
            <el-option :label="$t('admin.comments.allPosts')" value="" />
            <el-option
              v-for="post in posts"
              :key="post.id"
              :label="post.title"
              :value="post.id"
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="fetchComments" style="width: 100%;">
            <el-icon><Search /></el-icon>
            {{ $t('common.search') || '搜索' }}
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="comments" v-loading="loading" stripe>
        <el-table-column prop="content" :label="$t('admin.comments.contentColumn')" min-width="200">
          <template #default="{ row }">
            <div class="comment-content">{{ row.content }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="post_title" :label="$t('admin.comments.postColumn')" min-width="150">
          <template #default="{ row }">
            <el-link @click="viewPost(row.post_id)" type="primary">
              {{ row.post_title }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="user_nickname" :label="$t('admin.comments.userColumn')" width="120" />
        <el-table-column prop="created_at" :label="$t('admin.comments.createdAtColumn')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="$t('admin.comments.statusColumn')" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('admin.comments.actionsColumn')" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              size="small"
              type="success"
              @click="approveComment(row)"
            >
              {{ $t('admin.comments.approve') }}
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              size="small"
              type="warning"
              @click="rejectComment(row)"
            >
              {{ $t('admin.comments.reject') }}
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteComment(row)"
            >
              {{ $t('admin.comments.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchComments"
        class="pagination"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Search } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const router = useRouter()
const { t } = useI18n()

const loading = ref(false)
const comments = ref([])
const posts = ref([])
const searchKeyword = ref('')
const statusFilter = ref('')
const postFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const fetchComments = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }

    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    if (postFilter.value) {
      params.post_id = postFilter.value
    }

    const response = await adminApi.getComments(params)

    if (response.success) {
      comments.value = response.data
      total.value = response.total || 0
    }
  } catch (error) {
    console.error('获取评论列表失败:', error)
    ElMessage.error(t('admin.comments.loadError'))
  } finally {
    loading.value = false
  }
}

const fetchPosts = async () => {
  try {
    const response = await adminApi.getPosts({ limit: 1000 })
    if (response.success) {
      posts.value = response.data
    }
  } catch (error) {
    console.error('获取内容列表失败:', error)
  }
}

const approveComment = async (comment) => {
  try {
    const response = await adminApi.approveComment(comment.id)
    if (response.success) {
      ElMessage.success(t('admin.comments.approveSuccess'))
      fetchComments()
    }
  } catch (error) {
    console.error('审核通过失败:', error)
    ElMessage.error(error.response?.data?.message || '操作失败')
  }
}

const rejectComment = async (comment) => {
  try {
    const response = await adminApi.rejectComment(comment.id)
    if (response.success) {
      ElMessage.success(t('admin.comments.rejectSuccess'))
      fetchComments()
    }
  } catch (error) {
    console.error('拒绝评论失败:', error)
    ElMessage.error(error.response?.data?.message || '操作失败')
  }
}

const deleteComment = async (comment) => {
  try {
    await ElMessageBox.confirm(
      t('admin.comments.deleteConfirm'),
      t('admin.comments.deleteTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )

    const response = await adminApi.deleteComment(comment.id)
    if (response.success) {
      ElMessage.success(t('admin.comments.deleteSuccess'))
      fetchComments()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除评论失败:', error)
      ElMessage.error(error.response?.data?.message || '操作失败')
    }
  }
}

const viewPost = (postId) => {
  window.open(`/post/${postId}`, '_blank')
}

const getStatusText = (status) => {
  const statusMap = {
    pending: t('admin.comments.pending'),
    approved: t('admin.comments.approved'),
    rejected: t('admin.comments.rejected')
  }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString(t('locale') || 'zh-CN')
}

const goBack = () => {
  router.push('/admin/dashboard')
}

onMounted(() => {
  fetchComments()
  fetchPosts()
})
</script>

<style scoped>
.comment-management {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-top: 20px;
}

.comment-content {
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
