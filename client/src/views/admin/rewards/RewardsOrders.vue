<template>
  <div class="rewards-orders-page">
    <el-breadcrumb separator="/" class="breadcrumb">
      <el-breadcrumb-item :to="{ path: '/admin/dashboard' }">{{ $t('admin.menu.dashboard') }}</el-breadcrumb-item>
      <el-breadcrumb-item>{{ $t('admin.menu.business') }}</el-breadcrumb-item>
      <el-breadcrumb-item>{{ $t('admin.menu.rewardsManagement') }}</el-breadcrumb-item>
      <el-breadcrumb-item>{{ $t('admin.menu.rewardsOrders') }}</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()" circle>
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h2>{{ $t('admin.menu.rewardsOrders') }}</h2>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="订单状态">
          <el-select v-model="filterStatus" placeholder="全部状态" style="width: 150px">
            <el-option label="全部状态" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="待支付" value="awaiting_payment" />
            <el-option label="已支付" value="paid" />
            <el-option label="处理中" value="processing" />
            <el-option label="已完成" value="fulfilled" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="支付方式">
          <el-select v-model="filterPaymentType" placeholder="全部方式" style="width: 150px">
            <el-option label="全部方式" value="" />
            <el-option label="纯积分" value="points" />
            <el-option label="纯现金" value="cash" />
            <el-option label="混合支付" value="hybrid" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadOrders">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="orders" v-loading="loading">
        <el-table-column prop="id" label="订单ID" width="80" />
        <el-table-column label="用户" width="150">
          <template #default="{ row }">
            <div class="user-info">
              <div>{{ row.user?.display_name || 'Unknown' }}</div>
              <div class="user-id">ID: {{ row.user_id }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="商品信息" min-width="250">
          <template #default="{ row }">
            <div class="item-info">
              <el-image 
                :src="row.reward_item?.cover || '/default-reward.png'" 
                fit="cover" 
                style="width: 50px; height: 50px; margin-right: 12px" 
              />
              <div>
                <div class="item-title">{{ row.reward_item?.title || '未知商品' }}</div>
                <div class="item-qty">数量: {{ row.quantity }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="支付方式" width="180">
          <template #default="{ row }">
            <div v-if="getPaymentType(row) === 'points'" class="payment-info">
              <el-tag type="primary" size="small">💎 纯积分</el-tag>
              <div class="payment-amount">{{ row.points_used }}积分</div>
            </div>
            <div v-else-if="getPaymentType(row) === 'cash'" class="payment-info">
              <el-tag type="success" size="small">฿ 纯现金</el-tag>
              <div class="payment-amount">฿{{ parseFloat(row.cash_paid).toFixed(2) }}</div>
            </div>
            <div v-else class="payment-info">
              <el-tag type="warning" size="small">混合支付</el-tag>
              <div class="payment-amount">
                ฿{{ parseFloat(row.cash_paid).toFixed(2) }} + {{ row.points_used }}积分
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleViewDetail(row)">查看</el-button>
            <el-button 
              v-if="row.status === 'pending' || row.status === 'processing'" 
              size="small" 
              type="success"
              @click="handleFulfill(row)"
            >
              完成
            </el-button>
            <el-button 
              v-if="row.status === 'pending'" 
              size="small" 
              type="danger"
              @click="handleCancel(row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination
        v-if="pagination.total > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        @current-change="loadOrders"
        @size-change="loadOrders"
        layout="total, sizes, prev, pager, next"
        :page-sizes="[10, 20, 50, 100]"
        class="pagination"
      />
    </el-card>

    <el-dialog
      v-model="detailVisible"
      title="订单详情"
      width="700px"
    >
      <div v-if="selectedOrder" class="order-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单ID">{{ selectedOrder.id }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag :type="getStatusType(selectedOrder.status)">
              {{ getStatusLabel(selectedOrder.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ selectedOrder.user_id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ selectedOrder.user?.display_name || 'Unknown' }}</el-descriptions-item>
          <el-descriptions-item label="商品名称" :span="2">{{ selectedOrder.reward_item?.title }}</el-descriptions-item>
          <el-descriptions-item label="购买数量">{{ selectedOrder.quantity }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">
            <el-tag v-if="getPaymentType(selectedOrder) === 'points'" type="primary">纯积分</el-tag>
            <el-tag v-else-if="getPaymentType(selectedOrder) === 'cash'" type="success">纯现金</el-tag>
            <el-tag v-else type="warning">混合支付</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="积分支付">{{ selectedOrder.points_used || 0 }}积分</el-descriptions-item>
          <el-descriptions-item label="现金支付">฿{{ parseFloat(selectedOrder.cash_paid || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="下单时间" :span="2">{{ formatDate(selectedOrder.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="2">{{ formatDate(selectedOrder.updated_at) }}</el-descriptions-item>
          <el-descriptions-item v-if="selectedOrder.fulfillment_data" label="物流信息" :span="2">
            {{ selectedOrder.fulfillment_data }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'

export default defineComponent({
  name: 'RewardsOrders',
  setup() {
    const orders = ref([])
    const loading = ref(false)
    const filterStatus = ref('')
    const filterPaymentType = ref('')
    const detailVisible = ref(false)
    const selectedOrder = ref(null)
    
    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    })

    const loadOrders = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit
        }
        if (filterStatus.value) params.status = filterStatus.value
        if (filterPaymentType.value) params.payment_type = filterPaymentType.value
        
        const token = localStorage.getItem('admin_token')
        const { data } = await axios.get('/api/rewards/admin/orders', { 
          params,
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        orders.value = data.data || []
        if (data.pagination) {
          pagination.total = data.pagination.total
        }
      } catch (error) {
        console.error('加载订单列表失败:', error)
        ElMessage.error(error.response?.data?.message || '加载订单列表失败')
      } finally {
        loading.value = false
      }
    }

    const getPaymentType = (order) => {
      const hasPoints = order.points_used && order.points_used > 0
      const hasCash = order.cash_paid && parseFloat(order.cash_paid) > 0
      
      if (hasPoints && hasCash) return 'hybrid'
      if (hasCash) return 'cash'
      return 'points'
    }

    const getStatusLabel = (status) => {
      const map = {
        pending: '待处理',
        awaiting_payment: '待支付',
        paid: '已支付',
        processing: '处理中',
        fulfilled: '已完成',
        cancelled: '已取消'
      }
      return map[status] || status
    }

    const getStatusType = (status) => {
      const map = {
        pending: 'warning',
        awaiting_payment: 'info',
        paid: 'success',
        processing: 'primary',
        fulfilled: 'success',
        cancelled: 'danger'
      }
      return map[status] || ''
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN')
    }

    const handleViewDetail = (order) => {
      selectedOrder.value = order
      detailVisible.value = true
    }

    const handleFulfill = async (order) => {
      try {
        await ElMessageBox.confirm('确认完成此订单？', '提示', {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'warning'
        })

        const token = localStorage.getItem('admin_token')
        await axios.patch(
          `/api/rewards/admin/orders/${order.id}/fulfill`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        
        ElMessage.success('订单已完成')
        loadOrders()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || '操作失败')
        }
      }
    }

    const handleCancel = async (order) => {
      try {
        await ElMessageBox.confirm('确认取消此订单？积分将退还给用户。', '提示', {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'warning'
        })

        const token = localStorage.getItem('admin_token')
        await axios.patch(
          `/api/rewards/admin/orders/${order.id}/cancel`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        
        ElMessage.success('订单已取消')
        loadOrders()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || '操作失败')
        }
      }
    }

    onMounted(() => {
      loadOrders()
    })

    return {
      orders,
      loading,
      filterStatus,
      filterPaymentType,
      pagination,
      detailVisible,
      selectedOrder,
      loadOrders,
      getPaymentType,
      getStatusLabel,
      getStatusType,
      formatDate,
      handleViewDetail,
      handleFulfill,
      handleCancel,
      ArrowLeft
    }
  }
})
</script>

<style scoped>
.rewards-orders-page {
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

.user-info {
  line-height: 1.6;
}

.user-id {
  font-size: 12px;
  color: #999;
}

.item-info {
  display: flex;
  align-items: center;
}

.item-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.item-qty {
  font-size: 12px;
  color: #999;
}

.payment-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.payment-amount {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.order-detail {
  padding: 10px 0;
}
</style>
