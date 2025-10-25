<template>
  <div class="admin-comments">
    <!-- 返回按钮 -->
    <el-button
      type="primary"
      @click="goBack"
      style="margin-bottom: 16px;"
      size="small"
    >
      <el-icon><ArrowLeft /></el-icon>
      {{ $t('common.back') }}
    </el-button>

    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">{{ $t('admin.comments.title') }}</h2>
      <p class="page-subtitle">{{ $t('admin.comments.subtitle') }}</p>
    </div>

    <!-- 筛选和搜索栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <el-select v-model="filters.status" @change="handleFilterChange" class="filter-select">
          <el-option :label="$t('admin.comments.allStatus')" value="all" />
          <el-option :label="$t('admin.comments.statusVisible')" value="visible" />
          <el-option :label="$t('admin.comments.statusHidden')" value="hidden" />
        </el-select>
      </div>
      <div class="filter-right">
        <el-input
          v-model="filters.search"
          :placeholder="$t('admin.comments.searchPlaceholder')"
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

    <!-- 评论列表 -->
    <el-table
      v-loading="loading"
      :data="comments"
      class="comments-table"
    >
      <el-table-column :label="$t('admin.comments.contentColumn')" min-width="300">
        <template #default="{ row }">
          <div class="comment-content">{{ row.content }}</div>
        </template>
      </el-table-column>
      <el-table-column :label="$t('admin.comments.postColumn')" width="120" prop="content_id" />
      <el-table-column :label="$t('admin.comments.userColumn')" width="140">
        <template #default="{ row }">
          <div class="comment-user">{{ row.author?.nickname || row.author?.name || '—' }}</div>
        </template>
      </el-table-column>
      <el-table-column :label="$t('admin.comments.createdAtColumn')" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('admin.comments.actionsColumn')" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="danger" size="small" @click="confirmDelete(row)">
            {{ $t('admin.comments.delete') }}
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
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  setup() {
    const loading = ref(false)
    const comments = ref([])
    const filters = reactive({
      status: 'all',
      search: ''
    })
    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    })

    // 获取评论列表
    const fetchComments = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          status: filters.status,
          search: filters.search,
          __ts: Date.now()
        }
        const token = localStorage.getItem('admin_token')
        const response = await fetch('/api/comments/admin?' + new URLSearchParams(params), {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (response.status === 401 || (data.error && data.error.includes('token'))) {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
          window.location.replace('/admin/login')
          return
        }
        if (data.success) {
          comments.value = data.data.comments
          pagination.total = data.data.pagination.total
        } else {
          throw new Error(data.error || '获取评论失败')
        }
      } catch (error) {
        console.error('获取评论失败:', error)
        ElMessage.error(error.message)
      } finally {
        loading.value = false
      }
    }

    // 筛选变化
    const handleFilterChange = () => {
      pagination.page = 1
      fetchComments()
    }

    // 搜索输入处理（防抖）
    let searchTimeout = null
    const handleSearchInput = () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
      searchTimeout = setTimeout(() => {
        pagination.page = 1
        fetchComments()
      }, 500)
    }

    // 分页变化
    const handlePaginationChange = () => {
      fetchComments()
    }

    // 删除确认
    const confirmDelete = (row) => {
      ElMessageBox.confirm(
        `${row.content}\n${this.$t('admin.comments.confirmDelete')}`,
        this.$t('common.confirm'),
        {
          confirmButtonText: this.$t('admin.comments.delete'),
          cancelButtonText: this.$t('common.cancel'),
          type: 'warning'
        }
      ).then(() => {
        deleteComment(row.id)
      })
    }

    // 删除评论
    const deleteComment = async (id) => {
      try {
        const token = localStorage.getItem('admin_token')
        const response = await fetch(`/api/comments/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (data.success) {
          ElMessage.success(this.$t('admin.comments.successDelete'))
          fetchComments()
        } else {
          throw new Error(data.error)
        }
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error(error.message)
      }
    }

    // 格式化日期
    const formatDate = (dateStr) => {
      if (!dateStr) return '—'
      return new Date(dateStr).toLocaleString()
    }

    // 返回按钮
    const goBack = () => {
      if (window.history.length > 1) {
        window.history.back()
      } else {
        window.location.href = '/admin'
      }
    }

    onMounted(() => {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        window.location.replace('/admin/login')
        return
      }
      fetchComments()
    })

    return {
      loading,
      comments,
      filters,
      pagination,
      fetchComments,
      handleFilterChange,
      handleSearchInput,
      handlePaginationChange,
      confirmDelete,
      deleteComment,
      formatDate,
      goBack
    }
  }
}
</script>

<style scoped>
.admin-comments {
  padding: 24px;
}
.page-header {
  display: flex;
  flex-direction: column;
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
.filter-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}
.filter-select {
  width: 160px;
  margin-right: 8px;
}
.search-input {
  width: 240px;
}
.comments-table {
  margin-bottom: 16px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>