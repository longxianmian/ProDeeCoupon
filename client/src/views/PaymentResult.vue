<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const order = ref(null)
const error = ref(null)
const API_BASE = '/api'

const statusConfig = {
  completed: {
    icon: '✅',
    title: 'payment.success_title',
    color: '#10b981',
    actionText: 'payment.view_order',
    actionRoute: '/rewards/history'
  },
  pending: {
    icon: '⏳',
    title: 'payment.pending_title',
    color: '#f59e0b',
    actionText: 'payment.check_status',
    actionRoute: null
  },
  failed: {
    icon: '❌',
    title: 'payment.failed_title',
    color: '#ef4444',
    actionText: 'payment.retry',
    actionRoute: null
  },
  refunded: {
    icon: '↩️',
    title: 'payment.refunded_title',
    color: '#6b7280',
    actionText: 'payment.view_order',
    actionRoute: '/rewards/history'
  }
}

const fetchOrderStatus = async () => {
  try {
    loading.value = true
    const orderNumber = route.params.order_number || route.query.order_number
    
    if (!orderNumber) {
      error.value = t('payment.no_order_number')
      return
    }

    const response = await axios.get(`${API_BASE}/payments/order/${orderNumber}`, {
      withCredentials: true
    })
    
    if (response.data.success) {
      order.value = response.data.data
    } else {
      error.value = response.data.error || t('payment.fetch_failed')
    }
  } catch (err) {
    console.error('获取订单状态失败:', err)
    error.value = err.response?.data?.error || t('payment.fetch_failed')
  } finally {
    loading.value = false
  }
}

const handleAction = () => {
  const config = statusConfig[order.value?.status]
  
  if (config.actionRoute) {
    router.push(config.actionRoute)
  } else if (order.value?.status === 'pending') {
    fetchOrderStatus()
  } else if (order.value?.status === 'failed') {
    router.push(`/rewards/${order.value.item_id}`)
  }
}

const goBack = () => {
  router.push('/rewards')
}

onMounted(() => {
  fetchOrderStatus()
})
</script>

<template>
  <div class="payment-result">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>{{ t('payment.checking_status') }}</p>
    </div>

    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h2>{{ t('payment.error_title') }}</h2>
      <p>{{ error }}</p>
      <button class="btn-primary" @click="goBack">
        {{ t('payment.back_to_mall') }}
      </button>
    </div>

    <div v-else-if="order" class="result-container">
      <div class="status-icon" :style="{ color: statusConfig[order.status]?.color }">
        {{ statusConfig[order.status]?.icon }}
      </div>

      <h1 class="status-title">
        {{ t(statusConfig[order.status]?.title) }}
      </h1>

      <div class="order-details">
        <div class="detail-row">
          <span class="label">{{ t('payment.order_number') }}</span>
          <span class="value">{{ order.order_number }}</span>
        </div>
        <div class="detail-row">
          <span class="label">{{ t('payment.amount') }}</span>
          <span class="value amount">{{ order.currency }} {{ parseFloat(order.amount).toFixed(2) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">{{ t('payment.payment_method') }}</span>
          <span class="value">{{ order.payment_method || 'N/A' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">{{ t('payment.order_time') }}</span>
          <span class="value">{{ new Date(order.created_at).toLocaleString() }}</span>
        </div>
        <div v-if="order.paid_at" class="detail-row">
          <span class="label">{{ t('payment.paid_time') }}</span>
          <span class="value">{{ new Date(order.paid_at).toLocaleString() }}</span>
        </div>
      </div>

      <div class="actions">
        <button 
          class="btn-primary" 
          @click="handleAction"
        >
          {{ t(statusConfig[order.status]?.actionText) }}
        </button>
        <button class="btn-secondary" @click="goBack">
          {{ t('payment.back_to_mall') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payment-result {
  min-height: 100vh;
  background: #f9fafb;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-container,
.error-container,
.result-container {
  max-width: 500px;
  width: 100%;
  background: white;
  border-radius: 16px;
  padding: 40px 24px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon,
.status-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

.status-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 30px;
  color: #333;
}

.order-details {
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #e5e7eb;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  font-size: 14px;
  color: #666;
}

.detail-row .value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.detail-row .value.amount {
  font-size: 18px;
  color: #667eea;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  width: 100%;
  padding: 14px 20px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-1px);
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover {
  background: #f5f7ff;
}

.error-container h2 {
  font-size: 20px;
  margin-bottom: 12px;
  color: #333;
}

.error-container p {
  color: #666;
  margin-bottom: 24px;
  line-height: 1.6;
}
</style>
