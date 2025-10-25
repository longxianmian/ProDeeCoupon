<template>
  <div class="my-content">
    <el-card class="header-card">
      <div class="header-section">
        <el-button @click="goBack" style="margin-right: 16px;">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2>我的内容与数据</h2>
      </div>
    </el-card>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <el-icon :size="24"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ kpiData.post_count || 0 }}</div>
              <div class="stat-label">发布内容</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
              <el-icon :size="24"><Star /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ kpiData.total_likes || 0 }}</div>
              <div class="stat-label">获赞总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
              <el-icon :size="24"><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ kpiData.total_comments || 0 }}</div>
              <div class="stat-label">评论总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
              <el-icon :size="24"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ kpiData.follower_count || 0 }}</div>
              <div class="stat-label">粉丝数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="content-card">
      <div class="content-header">
        <h3>我的发布内容</h3>
        <div class="header-actions">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="fetchData"
            size="default"
          />
          <el-button type="primary" @click="goToCreatePost">
            <el-icon><Plus /></el-icon>
            发布新内容
          </el-button>
        </div>
      </div>

      <el-table :data="posts" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.images && row.images.length > 0"
              :src="row.images[0]"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px;"
            />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_published ? 'success' : 'info'">
              {{ row.is_published ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="likes_count" label="点赞" width="80" />
        <el-table-column prop="comments_count" label="评论" width="80" />
        <el-table-column prop="views_count" label="浏览" width="80" />
        <el-table-column prop="created_at" label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewPost(row)">查看</el-button>
            <el-button size="small" @click="editPost(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchPosts"
        class="pagination"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, Star, ChatDotRound, User, Plus, ArrowLeft } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const router = useRouter()
const loading = ref(false)
const kpiData = ref({
  post_count: 0,
  total_likes: 0,
  total_comments: 0,
  follower_count: 0
})

const posts = ref([])
const dateRange = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const fetchKpiData = async () => {
  try {
    const params = {}
    
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0].toISOString()
      params.end_date = dateRange.value[1].toISOString()
    }

    const response = await adminApi.getStaffKpi(params)

    if (response.success) {
      kpiData.value = response.data
    }
  } catch (error) {
    console.error('获取KPI数据失败:', error)
    ElMessage.error(error.response?.data?.message || '获取KPI数据失败')
  }
}

const fetchPosts = async () => {
  loading.value = true
  try {
    const adminData = JSON.parse(localStorage.getItem('admin_user') || '{}')
    
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      author_id: adminData.id
    }

    const response = await adminApi.getPosts(params)

    if (response.success) {
      posts.value = response.data
      total.value = response.total || posts.value.length
    }
  } catch (error) {
    console.error('获取内容列表失败:', error)
    ElMessage.error(error.response?.data?.message || '获取内容列表失败')
  } finally {
    loading.value = false
  }
}

const fetchData = () => {
  fetchKpiData()
  fetchPosts()
}

const goToCreatePost = () => {
  router.push('/admin/posts?action=create')
}

const viewPost = (post) => {
  window.open(`/post/${post.id}`, '_blank')
}

const editPost = (post) => {
  router.push(`/admin/posts?edit=${post.id}`)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const goBack = () => {
  router.push('/admin/dashboard')
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.my-content {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-section {
  display: flex;
  align-items: center;
}

.header-card h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #262626;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
}

.content-card {
  margin-top: 20px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.content-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
