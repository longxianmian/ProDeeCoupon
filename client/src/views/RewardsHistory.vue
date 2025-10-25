<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getRewardRedemptions } from '@/services/points'

const { t } = useI18n()
const router = useRouter()

const loading = ref(false)
const redemptions = ref([])

const statusColorMap = {
  pending: '#ff9800',
  shipped: '#2196f3',
  completed: '#4caf50',
  cancelled: '#9e9e9e'
}

async function loadData() {
  loading.value = true
  
  try {
    const res = await getRewardRedemptions()
    if (res?.success) {
      redemptions.value = res.data || []
    }
  } catch (err) {
    console.error('加载兑换记录失败:', err)
  } finally {
    loading.value = false
  }
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="rewards-history">
    <van-nav-bar
      :title="t('rewards.redemptionHistory.title')"
      left-arrow
      @click-left="router.back()"
    />

    <van-pull-refresh v-model="loading" @refresh="loadData">
      <div v-if="redemptions.length === 0" class="empty-state">
        <van-empty :description="t('rewards.redemptionHistory.noRecords')" />
      </div>

      <div v-else class="redemption-list">
        <div
          v-for="item in redemptions"
          :key="item.id"
          class="redemption-item"
        >
          <div class="item-header">
            <span class="item-time">{{ formatDate(item.created_at) }}</span>
            <van-tag
              :color="statusColorMap[item.status]"
              plain
            >
              {{ t(`rewards.redemptionHistory.${item.status}`) }}
            </van-tag>
          </div>

          <div class="item-content">
            <div class="item-image">
              <img
                :src="item.reward?.image_url || '/default-reward.jpg'"
                :alt="item.reward?.name"
              />
            </div>

            <div class="item-info">
              <div class="item-name">{{ item.reward?.name }}</div>
              <div class="item-points">
                <span class="points-icon">💎</span>
                <span>{{ item.points_spent }} {{ t('points.points') }}</span>
              </div>
            </div>
          </div>

          <div v-if="item.tracking_number" class="tracking-info">
            <span class="tracking-label">{{ t('rewards.trackingNumber') }}:</span>
            <span class="tracking-number">{{ item.tracking_number }}</span>
          </div>
        </div>
      </div>
    </van-pull-refresh>
  </div>
</template>

<style scoped>
.rewards-history {
  min-height: 100vh;
  background: #f5f5f5;
}

.empty-state {
  padding: 60px 20px;
}

.redemption-list {
  padding: 12px;
}

.redemption-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.item-time {
  font-size: 13px;
  color: #999;
}

.item-content {
  display: flex;
  gap: 12px;
}

.item-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.item-points {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #667eea;
  font-weight: 500;
}

.points-icon {
  font-size: 16px;
}

.tracking-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  font-size: 13px;
}

.tracking-label {
  color: #666;
  margin-right: 8px;
}

.tracking-number {
  color: #333;
  font-weight: 500;
}
</style>
