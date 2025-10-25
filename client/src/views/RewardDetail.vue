<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showConfirmDialog, showSuccessToast, showFailToast } from 'vant'
import { getRewardDetail, redeemReward } from '../services/points'
import { useAuthStore } from '../stores/auth'
import PaymentMethodSelector from '../components/PaymentMethodSelector.vue'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const authStore = useAuthStore()

const reward = ref(null)
const loading = ref(false)
const currentImageIndex = ref(0)
const showPaymentSelector = ref(false)

const userPoints = computed(() => authStore.me?.points || 0)
const isAuthenticated = computed(() => authStore.isAuthenticated)

const localizedTitle = computed(() => {
  if (!reward.value) return ''
  const key = `title_${locale.value.replace('-', '_')}`
  return reward.value[key] || reward.value.title || ''
})

const localizedDescription = computed(() => {
  if (!reward.value) return ''
  const key = `description_${locale.value.replace('-', '_')}`
  return reward.value[key] || reward.value.description || ''
})

const images = computed(() => {
  if (!reward.value) return []
  if (reward.value.images && Array.isArray(reward.value.images)) {
    return reward.value.images
  }
  return reward.value.image_url ? [reward.value.image_url] : []
})

const paymentType = computed(() => {
  if (!reward.value) return 'points'
  const pointsCost = reward.value.points_required || reward.value.points_cost || 0
  const hasPoints = pointsCost > 0
  const hasCash = reward.value.cash_price && parseFloat(reward.value.cash_price) > 0
  
  if (hasPoints && hasCash) return 'hybrid'
  if (hasCash) return 'cash'
  return 'points'
})

const canRedeem = computed(() => {
  if (!reward.value) return false
  if (!isAuthenticated.value) return false
  if (reward.value.stock !== null && reward.value.stock <= 0) return false
  
  const pointsCost = reward.value.points_required || reward.value.points_cost || 0
  if (pointsCost > 0 && userPoints.value < pointsCost) return false
  
  return true
})

const hasCashPrice = computed(() => {
  return reward.value?.cash_price && parseFloat(reward.value.cash_price) > 0
})

const canBuyWithCash = computed(() => {
  if (!reward.value) return false
  if (!isAuthenticated.value) return false
  if (!hasCashPrice.value) return false
  if (reward.value.stock !== null && reward.value.stock <= 0) return false
  return true
})

const canBuyHybrid = computed(() => {
  if (!reward.value) return false
  if (!isAuthenticated.value) return false
  if (paymentType.value !== 'hybrid') return false
  if (reward.value.stock !== null && reward.value.stock <= 0) return false
  
  const pointsCost = reward.value.points_required || reward.value.points_cost || 0
  if (userPoints.value < pointsCost) return false
  
  return true
})

async function loadReward() {
  loading.value = true
  try {
    const res = await getRewardDetail(route.params.id)
    if (res?.success) {
      reward.value = res.data
    } else {
      showFailToast(t('rewards.loadFailed'))
      router.back()
    }
  } catch (err) {
    console.error('加载礼品详情失败:', err)
    showFailToast(t('rewards.loadFailed'))
    router.back()
  } finally {
    loading.value = false
  }
}

async function handleRedeem() {
  if (!isAuthenticated.value) {
    showFailToast(t('rewards.loginRequired'))
    return
  }

  const confirmed = await showConfirmDialog({
    title: t('rewards.confirmRedeem'),
    message: t('rewards.confirmRedeemMessage', {
      name: localizedTitle.value,
      points: reward.value.points_required
    })
  }).catch(() => false)

  if (!confirmed) return

  try {
    const res = await redeemReward(reward.value.id)
    if (res?.success) {
      showSuccessToast(t('rewards.redeemSuccess'))
      authStore.fetchUserInfo()
      router.push('/rewards/history')
    } else {
      showFailToast(res?.error || t('rewards.redeemFailed'))
    }
  } catch (err) {
    console.error('兑换失败:', err)
    showFailToast(t('rewards.redeemFailed'))
  }
}

function handleBuyWithCash() {
  if (!isAuthenticated.value) {
    showFailToast(t('rewards.loginRequired'))
    return
  }
  showPaymentSelector.value = true
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/rewards')
  }
}

onMounted(() => {
  loadReward()
})
</script>

<template>
  <div class="reward-detail">
    <van-nav-bar
      :title="t('rewards.detail')"
      left-arrow
      @click-left="goBack"
    />

    <van-loading v-if="loading" class="loading-center" size="32px" />

    <div v-else-if="reward" class="detail-content">
      <div class="image-section">
        <van-swipe
          v-if="images.length > 0"
          :autoplay="3000"
          indicator-color="white"
          @change="currentImageIndex = $event"
        >
          <van-swipe-item v-for="(img, idx) in images" :key="idx">
            <img :src="img" :alt="localizedTitle" class="reward-image" />
          </van-swipe-item>
        </van-swipe>
        <img
          v-else
          src="/default-coupon.jpg"
          :alt="localizedTitle"
          class="reward-image"
        />
      </div>

      <div class="info-section">
        <div class="title">{{ localizedTitle }}</div>

        <!-- Pure Points Mode -->
        <div v-if="paymentType === 'points'" class="points-row">
          <div class="points-label">{{ t('rewards.pointsRequired') }}</div>
          <div class="points-value">
            <span class="points-icon">💎</span>
            <span class="points-text">{{ reward.points_required || reward.points_cost }}</span>
          </div>
        </div>

        <!-- Pure Cash Mode -->
        <div v-else-if="paymentType === 'cash'" class="cash-price-row">
          <div class="cash-label">{{ t('rewards.cashPrice') }}</div>
          <div class="cash-value">฿{{ parseFloat(reward.cash_price).toFixed(2) }}</div>
        </div>

        <!-- Hybrid Mode -->
        <div v-else-if="paymentType === 'hybrid'" class="hybrid-price-section">
          <div class="hybrid-label">{{ t('mall.hybridPrice') || '混合支付' }}</div>
          <div class="hybrid-prices">
            <div class="hybrid-cash">
              <span class="label">{{ t('rewards.cashPrice') }}:</span>
              <span class="value">฿{{ parseFloat(reward.cash_price).toFixed(2) }}</span>
            </div>
            <span class="plus-sign">+</span>
            <div class="hybrid-points">
              <span class="label">{{ t('rewards.pointsRequired') }}:</span>
              <span class="value">
                <span class="points-icon">💎</span>
                {{ reward.points_required || reward.points_cost }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="reward.stock !== null" class="stock-row">
          <span class="stock-label">{{ t('rewards.stock') }}:</span>
          <span :class="['stock-value', { 'out-of-stock': reward.stock <= 0 }]">
            {{ reward.stock <= 0 ? t('rewards.outOfStock') : `${reward.stock}${t('rewards.pieces')}` }}
          </span>
        </div>

        <div class="description-section">
          <div class="section-title">{{ t('rewards.productDescription') }}</div>
          <div class="description-text">{{ localizedDescription }}</div>
        </div>

        <div v-if="reward.redemption_notes" class="notes-section">
          <div class="section-title">{{ t('rewards.redemptionNotes') }}</div>
          <div class="notes-text">{{ reward.redemption_notes }}</div>
        </div>
      </div>
    </div>

    <div v-if="reward && !loading" class="bottom-bar">
      <div class="user-points">
        <div class="my-points-label">{{ t('rewards.myPoints') }}</div>
        <div class="my-points-value">{{ userPoints.toLocaleString() }}</div>
      </div>

      <div class="button-group">
        <!-- Pure Points Mode - Single Button -->
        <van-button
          v-if="paymentType === 'points'"
          type="primary"
          size="large"
          round
          :disabled="!canRedeem"
          @click="handleRedeem"
          class="redeem-button single-button"
        >
          {{
            !isAuthenticated
              ? t('rewards.loginToRedeem')
              : reward.stock !== null && reward.stock <= 0
              ? t('rewards.outOfStock')
              : userPoints < (reward.points_required || reward.points_cost || 0)
              ? t('rewards.pointsInsufficient')
              : t('rewards.redeemNow')
          }}
        </van-button>

        <!-- Pure Cash Mode - Single Button -->
        <van-button
          v-else-if="paymentType === 'cash'"
          type="success"
          size="large"
          round
          :disabled="!canBuyWithCash"
          @click="handleBuyWithCash"
          class="cash-button single-button"
        >
          {{
            !isAuthenticated
              ? t('rewards.loginToRedeem')
              : reward.stock !== null && reward.stock <= 0
              ? t('rewards.outOfStock')
              : t('payment.pay_with_cash') || '现金购买'
          }}
        </van-button>

        <!-- Hybrid Mode - Single Button -->
        <van-button
          v-else-if="paymentType === 'hybrid'"
          type="warning"
          size="large"
          round
          :disabled="!canBuyHybrid"
          @click="handleBuyWithCash"
          class="hybrid-button single-button"
        >
          {{
            !isAuthenticated
              ? t('rewards.loginToRedeem')
              : reward.stock !== null && reward.stock <= 0
              ? t('rewards.outOfStock')
              : userPoints < (reward.points_required || reward.points_cost || 0)
              ? t('rewards.pointsInsufficient')
              : t('payment.pay_hybrid') || '混合支付购买'
          }}
        </van-button>
      </div>
    </div>

    <PaymentMethodSelector
      v-if="reward"
      v-model:show="showPaymentSelector"
      :amount="reward.cash_price"
      :reward-id="reward.id"
      :reward-name="localizedTitle"
    />
  </div>
</template>

<style scoped>
.reward-detail {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 80px;
}

.loading-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
}

.image-section {
  width: 100%;
  background: white;
}

.reward-image {
  width: 100%;
  height: 375px;
  object-fit: cover;
}

.info-section {
  background: white;
  margin-top: 8px;
  padding: 16px;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 16px;
  line-height: 1.4;
}

.points-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #ebedf0;
}

.points-label {
  font-size: 14px;
  color: #646566;
}

.points-value {
  display: flex;
  align-items: center;
  gap: 4px;
}

.points-icon {
  font-size: 18px;
}

.points-text {
  font-size: 20px;
  font-weight: 600;
  color: #1989fa;
}

.cash-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #ebedf0;
}

.cash-label {
  font-size: 14px;
  color: #646566;
}

.cash-value {
  font-size: 20px;
  font-weight: 600;
  color: #07c160;
}

.hybrid-price-section {
  padding: 16px 0;
  border-bottom: 1px solid #ebedf0;
}

.hybrid-label {
  font-size: 14px;
  color: #646566;
  margin-bottom: 12px;
}

.hybrid-prices {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hybrid-cash,
.hybrid-points {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hybrid-cash .label,
.hybrid-points .label {
  font-size: 12px;
  color: #969799;
}

.hybrid-cash .value {
  font-size: 18px;
  font-weight: 600;
  color: #07c160;
}

.hybrid-points .value {
  font-size: 18px;
  font-weight: 600;
  color: #1989fa;
  display: flex;
  align-items: center;
  gap: 4px;
}

.plus-sign {
  font-size: 20px;
  font-weight: 600;
  color: #323233;
  margin: 0 8px;
}

.stock-row {
  padding: 12px 0;
  border-bottom: 1px solid #ebedf0;
}

.stock-label {
  font-size: 14px;
  color: #646566;
  margin-right: 8px;
}

.stock-value {
  font-size: 14px;
  color: #07c160;
}

.stock-value.out-of-stock {
  color: #ee0a24;
}

.description-section,
.notes-section {
  margin-top: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 8px;
}

.description-text,
.notes-text {
  font-size: 14px;
  color: #646566;
  line-height: 1.6;
  white-space: pre-wrap;
}

.notes-text {
  background: #fff7e6;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid #ff976a;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 12px 16px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 100;
}

.user-points {
  flex: 0 0 auto;
}

.my-points-label {
  font-size: 12px;
  color: #969799;
}

.my-points-value {
  font-size: 18px;
  font-weight: 600;
  color: #1989fa;
}

.button-group {
  flex: 1;
  display: flex;
  gap: 8px;
}

.single-button {
  flex: 1;
  height: 44px;
}

.half-button {
  flex: 1;
  height: 44px;
  font-size: 14px;
}

.redeem-button {
  height: 44px;
}

.cash-button {
  height: 44px;
}
</style>
