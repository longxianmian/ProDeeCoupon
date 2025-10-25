<template>
  <div class="admin-redemptions">
    <el-card shadow="never" class="page-header">
      <div class="header-content">
        <div class="header-left">
          <el-button @click="$router.back()" :icon="ArrowLeft">{{ $t('common.back') }}</el-button>
          <h2>{{ $t('admin.menu.redemptionManagement') }}</h2>
        </div>
        <div class="header-right">
          <el-button @click="exportRedemptions" :icon="Download">
            {{ $t('admin.redemptions.export') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="redemptions-content">
      <!-- 搜索和筛选 -->
      <div class="search-section">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-input
              v-model="searchKeyword"
              :placeholder="$t('admin.redemptions.searchPlaceholder')"
              @input="handleSearch"
              @clear="handleSearch"
              clearable
              :prefix-icon="Search"
            />
          </el-col>
          <el-col :span="5">
            <el-select
              v-model="storeFilter"
              :placeholder="$t('admin.redemptions.storeFilter')"
              @change="handleSearch"
              clearable
              filterable
            >
              <el-option :label="$t('common.allStores')" value="" />
              <el-option 
                v-for="store in storeList" 
                :key="store.id" 
                :label="store.name" 
                :value="store.id" 
              />
            </el-select>
          </el-col>
          <el-col :span="5">
            <el-select
              v-model="methodFilter"
              :placeholder="$t('admin.redemptions.methodFilter')"
              @change="handleSearch"
              clearable
            >
              <el-option :label="$t('common.allMethods')" value="" />
              <el-option :label="$t('admin.redemptions.qrcode')" value="qrcode" />
              <el-option :label="$t('admin.redemptions.manual')" value="manual" />
            </el-select>
          </el-col>
          <el-col :span="8">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              :range-separator="$t('admin.redemptions.dateTo')"
              :start-placeholder="$t('admin.redemptions.dateFrom')"
              :end-placeholder="$t('admin.redemptions.dateTo')"
              @change="handleSearch"
              style="width: 100%"
            />
          </el-col>
        </el-row>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-section">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-content">
                <div class="stat-value">{{ totalRedemptions }}</div>
                <div class="stat-label">{{ $t('admin.redemptions.totalRedemptions') }}</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-content">
                <div class="stat-value">{{ todayRedemptions }}</div>
                <div class="stat-label">{{ $t('admin.redemptions.todayRedemptions') }}</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-content">
                <div class="stat-value">¥{{ totalValue }}</div>
                <div class="stat-label">{{ $t('admin.redemptions.totalValue') }}</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-content">
                <div class="stat-value">{{ avgRedemptionsPerDay }}</div>
                <div class="stat-label">{{ $t('admin.redemptions.avgPerDay') }}</div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 核销记录表格 -->
      <el-table 
        :data="redemptionList" 
        v-loading="loading"
        stripe
        style="width: 100%; margin-top: 20px;"
      >
        <el-table-column type="index" width="50" />
        <el-table-column 
          prop="user_name" 
          :label="$t('admin.redemptions.userName')"
          width="120"
        />
        <el-table-column 
          prop="coupon_title" 
          :label="$t('admin.redemptions.couponTitle')"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column 
          prop="store_name" 
          :label="$t('admin.redemptions.storeName')"
          width="150"
        />
        <el-table-column 
          prop="discount_price" 
          :label="$t('admin.redemptions.value')"
          width="100"
        >
          <template #default="scope">
            <span style="color: #f56c6c; font-weight: 500;">
              ¥{{ scope.row.discount_price }}
            </span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="verification_method" 
          :label="$t('admin.redemptions.method')"
          width="100"
        >
          <template #default="scope">
            <el-tag 
              :type="scope.row.verification_method === 'qrcode' ? 'success' : 'warning'"
              size="small"
            >
              {{ getMethodText(scope.row.verification_method) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column 
          prop="verifier_name" 
          :label="$t('admin.redemptions.verifier')"
          width="120"
        />
        <el-table-column 
          prop="redeemed_at" 
          :label="$t('admin.redemptions.redeemedAt')"
          width="160"
        >
          <template #default="scope">
            {{ formatDateTime(scope.row.redeemed_at) }}
          </template>
        </el-table-column>
        <el-table-column 
          prop="notes" 
          :label="$t('admin.redemptions.notes')"
          min-width="150"
          show-overflow-tooltip
        >
          <template #default="scope">
            <span v-if="scope.row.notes">{{ scope.row.notes }}</span>
            <span v-else style="color: #999;">-</span>
          </template>
        </el-table-column>
        <el-table-column 
          :label="$t('admin.redemptions.actions')"
          width="120"
          fixed="right"
        >
          <template #default="scope">
            <el-button 
              size="small" 
              @click="viewRedemption(scope.row)"
              :icon="View"
            >
              {{ $t('admin.redemptions.view') }}
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

    <!-- 核销详情对话框 -->
    <el-dialog 
      v-model="showRedemptionDetail" 
      :title="$t('admin.redemptions.redemptionDetail')"
      width="600px"
    >
      <div v-if="selectedRedemption" class="redemption-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item :label="$t('admin.redemptions.userName')">
            {{ selectedRedemption.user_name }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('admin.redemptions.userLineId')">
            {{ selectedRedemption.line_id }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('admin.redemptions.couponTitle')" :span="2">
            {{ selectedRedemption.coupon_title }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('admin.redemptions.storeName')">
            {{ selectedRedemption.store_name }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('admin.redemptions.value')">
            <span style="color: #f56c6c; font-weight: 500;">
              ¥{{ selectedRedemption.discount_price }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('admin.redemptions.method')">
            <el-tag 
              :type="selectedRedemption.verification_method === 'qrcode' ? 'success' : 'warning'"
              size="small"
            >
              {{ getMethodText(selectedRedemption.verification_method) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('admin.redemptions.verifier')">
            {{ selectedRedemption.verifier_name }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('admin.redemptions.redeemedAt')" :span="2">
            {{ formatDateTime(selectedRedemption.redeemed_at) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('admin.redemptions.notes')" :span="2">
            <span v-if="selectedRedemption.notes">{{ selectedRedemption.notes }}</span>
            <span v-else style="color: #999;">{{ $t('admin.redemptions.noNotes') }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      
      <template #footer>
        <el-button @click="showRedemptionDetail = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Download, Search, View } from '@element-plus/icons-vue'
import axios from 'axios'

export default defineComponent({
  name: 'AdminRedemptions',
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    
    // 页面状态
    const loading = ref(false)
    const searchKeyword = ref('')
    const storeFilter = ref('')
    const methodFilter = ref('')
    const dateRange = ref([])
    
    // 分页状态
    const currentPage = ref(1)
    const pageSize = ref(20)
    const totalCount = ref(0)
    
    // 数据
    const redemptionList = ref([])
    const storeList = ref([])
    
    // 统计数据
    const totalRedemptions = ref(0)
    const todayRedemptions = ref(0)
    const totalValue = ref(0)
    const avgRedemptionsPerDay = ref(0)
    
    // 核销详情
    const showRedemptionDetail = ref(false)
    const selectedRedemption = ref(null)

    // 获取核销记录列表
    const loadRedemptions = async () => {
      try {
        loading.value = true
        
        const token = localStorage.getItem('admin_token')
        const response = await axios.get('/api/admin/redemptions', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            page: currentPage.value,
            limit: pageSize.value,
            search: searchKeyword.value,
            store_id: storeFilter.value,
            method: methodFilter.value,
            date_from: dateRange.value?.[0],
            date_to: dateRange.value?.[1]
          }
        })

        if (response.data.success) {
          redemptionList.value = response.data.data
          totalCount.value = response.data.pagination.total
        }
      } catch (error) {
        console.error('加载核销记录失败:', error)
        if (error.response?.status === 401) {
          router.push('/admin/login')
        } else {
          ElMessage.error(t('admin.redemptions.loadError'))
        }
      } finally {
        loading.value = false
      }
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
            limit: 1000
          }
        })

        if (response.data.success) {
          storeList.value = response.data.data
        }
      } catch (error) {
        console.error('加载门店列表失败:', error)
      }
    }

    // 加载统计数据
    const loadStats = async () => {
      try {
        const token = localStorage.getItem('admin_token')
        const response = await axios.get('/api/admin/redemptions/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data.success) {
          const stats = response.data.stats
          totalRedemptions.value = stats.total || 0
          todayRedemptions.value = stats.today || 0
          totalValue.value = stats.totalValue || 0
          avgRedemptionsPerDay.value = stats.avgPerDay || 0
        }
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    }

    // 搜索
    const handleSearch = () => {
      currentPage.value = 1
      loadRedemptions()
    }

    // 分页大小改变
    const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
      loadRedemptions()
    }

    // 当前页改变
    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
      loadRedemptions()
    }

    // 查看核销详情
    const viewRedemption = (redemption) => {
      selectedRedemption.value = redemption
      showRedemptionDetail.value = true
    }

    // 导出核销记录
    const exportRedemptions = async () => {
      try {
        ElMessage.success(t('admin.redemptions.exportStarted'))
        
        const token = localStorage.getItem('admin_token')
        const response = await axios.get('/api/admin/redemptions/export', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            search: searchKeyword.value,
            store_id: storeFilter.value,
            method: methodFilter.value,
            date_from: dateRange.value?.[0],
            date_to: dateRange.value?.[1]
          },
          responseType: 'blob'
        })

        // 创建下载链接
        const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `redemptions_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        ElMessage.success(t('admin.redemptions.exportSuccess'))
      } catch (error) {
        console.error('导出核销记录失败:', error)
        ElMessage.error(t('admin.redemptions.exportError'))
      }
    }

    // 格式化日期时间
    const formatDateTime = (dateString) => {
      if (!dateString) return '-'
      return new Date(dateString).toLocaleString()
    }

    // 获取核销方式文本
    const getMethodText = (method) => {
      switch (method) {
        case 'qrcode': return t('admin.redemptions.qrcode')
        case 'manual': return t('admin.redemptions.manual')
        default: return method
      }
    }

    onMounted(() => {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin/login')
        return
      }
      
      loadRedemptions()
      loadStores()
      loadStats()
    })

    return {
      // 页面状态
      loading,
      searchKeyword,
      storeFilter,
      methodFilter,
      dateRange,
      
      // 分页状态
      currentPage,
      pageSize,
      totalCount,
      
      // 数据
      redemptionList,
      storeList,
      
      // 统计数据
      totalRedemptions,
      todayRedemptions,
      totalValue,
      avgRedemptionsPerDay,
      
      // 核销详情
      showRedemptionDetail,
      selectedRedemption,
      
      // 方法
      handleSearch,
      handleSizeChange,
      handleCurrentChange,
      viewRedemption,
      exportRedemptions,
      formatDateTime,
      getMethodText,
      
      // 图标
      ArrowLeft,
      Download,
      Search,
      View
    }
  }
})
</script>

<style scoped>
.admin-redemptions {
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

.redemptions-content {
  padding: 20px;
}

.search-section {
  margin-bottom: 20px;
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 20px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.redemption-detail {
  padding: 20px 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .redemptions-content {
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
  
  .stats-section .el-col {
    margin-bottom: 10px;
  }
}
</style>