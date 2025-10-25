<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { getPoints, getRewards } from '@/services/points'
import { showFailToast } from 'vant'

const props = defineProps({
  hideNavBar: {
    type: Boolean,
    default: false
  }
})

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const rewards = ref([])
const userPoints = ref(0)
const activeCategory = ref('recommended')
const searchQuery = ref('')

const categories = computed(() => [
  { value: 'recommended', label: t('mall.categories.recommended'), icon: '🔥' },
  { value: 'fashion', label: t('mall.categories.fashion'), icon: '👗' },
  { value: 'food', label: t('mall.categories.food'), icon: '🍔' },
  { value: 'beauty', label: t('mall.categories.beauty'), icon: '💄' },
  { value: 'home', label: t('mall.categories.home'), icon: '🏠' },
  { value: 'electronics', label: t('mall.categories.electronics'), icon: '📱' },
  { value: 'kids', label: t('mall.categories.kids'), icon: '👶' },
  { value: 'education', label: t('mall.categories.education'), icon: '📚' }
])

const quickActions = computed(() => [
  { key: 'orders', label: t('mall.quickActions.orders'), icon: 'orders-o', path: '/rewards/history' },
  { key: 'coupons', label: t('mall.quickActions.coupons'), icon: 'coupon-o', path: '/my-coupons' },
  { key: 'cart', label: t('mall.quickActions.cart'), icon: 'shopping-cart-o', path: '/cart', badge: 0 },
  { key: 'gifts', label: t('mall.quickActions.gifts'), icon: 'gift-o', path: '/gifts' }
])

const filteredRewards = computed(() => {
  let result = rewards.value

  // Category filter
  if (activeCategory.value !== 'recommended') {
    result = result.filter(r => r.category === activeCategory.value)
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(r => {
      const title = getLocalizedField(r, 'title').toLowerCase()
      const desc = getLocalizedField(r, 'description').toLowerCase()
      return title.includes(query) || desc.includes(query)
    })
  }

  return result
})

function getLocalizedField(item, fieldName) {
  const localeKey = locale.value.replace('-', '_')
  const localizedField = `${fieldName}_${localeKey}`
  return item[localizedField] || item[fieldName] || ''
}

function getPriceType(item) {
  const hasPoints = item.points_cost && item.points_cost > 0
  const hasCash = item.cash_price && parseFloat(item.cash_price) > 0
  
  if (hasPoints && hasCash) return 'hybrid'
  if (hasCash) return 'cash'
  return 'points'
}

function formatPrice(price) {
  return parseFloat(price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadData() {
  loading.value = true
  
  try {
    const [pointsRes, rewardsRes] = await Promise.all([
      getPoints(),
      getRewards({ is_active: true })
    ])

    if (pointsRes?.success) {
      userPoints.value = pointsRes.data.balance || 0
    }

    if (rewardsRes?.success) {
      rewards.value = rewardsRes.data || []
    }
  } catch (err) {
    console.error('加载商城数据失败:', err)
    showFailToast(t('common.error'))
  } finally {
    loading.value = false
  }
}

function goToQuickAction(action) {
  if (action.key === 'cart' || action.key === 'gifts') {
    showFailToast(t('common.developmentFeature'))
    return
  }
  router.push(action.path)
}

function goBack() {
  router.push('/')
}

function onSearch() {
  console.log('搜索:', searchQuery.value)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="rewards-mall">
    <van-nav-bar
      v-if="!hideNavBar"
      :title="t('mall.title')"
      left-arrow
      @click-left="goBack"
    />

    <!-- 搜索框 -->
    <div class="search-section">
      <van-search
        v-model="searchQuery"
        :placeholder="t('mall.searchPlaceholder')"
        shape="round"
        @search="onSearch"
      />
    </div>

    <!-- 类目导航 -->
    <div class="categories-section">
      <van-tabs v-model:active="activeCategory" scrollable>
        <van-tab
          v-for="cat in categories"
          :key="cat.value"
          :name="cat.value"
          :title="`${cat.icon} ${cat.label}`"
        />
      </van-tabs>
    </div>

    <!-- 快捷入口 -->
    <div class="quick-actions">
      <div
        v-for="action in quickActions"
        :key="action.key"
        class="action-item"
        @click="goToQuickAction(action)"
      >
        <van-icon :name="action.icon" size="24" />
        <div class="action-label">{{ action.label }}</div>
        <van-badge v-if="action.badge" :content="action.badge" class="action-badge" />
      </div>
    </div>

    <!-- 商品列表 -->
    <van-pull-refresh v-model="loading" @refresh="loadData">
      <div v-if="filteredRewards.length === 0" class="empty-state">
        <van-empty :description="t('mall.noProducts')" />
      </div>

      <div v-else class="products-grid">
        <div
          v-for="item in filteredRewards"
          :key="item.id"
          class="product-card"
          @click="router.push(`/rewards/${item.id}`)"
        >
          <div class="product-image">
            <img
              :src="item.cover || item.image_url || '/default-reward.jpg'"
              :alt="getLocalizedField(item, 'title')"
            />
            <div v-if="item.stock !== null && item.stock <= 0" class="out-of-stock-badge">
              {{ t('mall.outOfStock') }}
            </div>
          </div>

          <div class="product-info">
            <div class="product-name">{{ getLocalizedField(item, 'title') }}</div>
            <div class="product-desc">{{ getLocalizedField(item, 'description') }}</div>
            
            <!-- 价格显示 -->
            <div class="product-price">
              <!-- 纯现金 -->
              <div v-if="getPriceType(item) === 'cash'" class="price-cash">
                <span class="currency">฿</span>
                <span class="amount">{{ formatPrice(item.cash_price) }}</span>
              </div>

              <!-- 纯积分 -->
              <div v-else-if="getPriceType(item) === 'points'" class="price-points">
                <span class="points-icon">💎</span>
                <span class="points-amount">{{ item.points_cost }}</span>
              </div>

              <!-- 混合支付 -->
              <div v-else class="price-hybrid">
                <div class="hybrid-cash">
                  <span class="currency">฿</span>
                  <span class="amount">{{ formatPrice(item.cash_price) }}</span>
                </div>
                <span class="plus">+</span>
                <div class="hybrid-points">
                  <span class="points-icon">💎</span>
                  <span class="points-amount">{{ item.points_cost }}</span>
                </div>
              </div>
            </div>

            <div v-if="item.stock !== null" class="stock-info">
              {{ t('mall.stockRemaining', { count: item.stock }) }}
            </div>
          </div>
        </div>
      </div>
    </van-pull-refresh>
  </div>
</template>

<style scoped>
.rewards-mall {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: var(--bottom-nav-h);
}

.search-section {
  background: white;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
}

.categories-section {
  background: white;
  border-bottom: 1px solid #eee;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 16px;
  background: white;
  margin-bottom: 8px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border-radius: 8px;
  background: #f7f8fa;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s;
}

.action-item:active {
  transform: scale(0.95);
  background: #eee;
}

.action-label {
  font-size: 12px;
  color: #333;
  text-align: center;
}

.action-badge {
  position: absolute;
  top: 8px;
  right: 12px;
}

.empty-state {
  padding: 60px 20px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.product-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.product-image {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  background: #f5f5f5;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.out-of-stock-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.product-info {
  padding: 12px;
}

.product-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-desc {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price {
  margin-bottom: 8px;
}

.price-cash,
.price-points,
.price-hybrid {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-weight: 600;
}

.price-cash .currency {
  font-size: 14px;
  color: #ff6b6b;
}

.price-cash .amount {
  font-size: 20px;
  color: #ff6b6b;
}

.price-points {
  color: #667eea;
}

.points-icon {
  font-size: 16px;
}

.points-amount {
  font-size: 20px;
  color: #667eea;
}

.price-hybrid {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hybrid-cash {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.hybrid-cash .currency {
  font-size: 12px;
  color: #ff6b6b;
}

.hybrid-cash .amount {
  font-size: 16px;
  color: #ff6b6b;
}

.plus {
  font-size: 12px;
  color: #999;
}

.hybrid-points {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.hybrid-points .points-icon {
  font-size: 14px;
}

.hybrid-points .points-amount {
  font-size: 16px;
  color: #667eea;
}

.stock-info {
  font-size: 11px;
  color: #ff6b6b;
  text-align: center;
  margin-top: 4px;
}
</style>
