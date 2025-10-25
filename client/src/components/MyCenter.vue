<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { provinceLabel } from '@/constants/provinces'
import { getMe, logoutUser, getUserCoupons } from '@/services/user'
import { getRewardRedemptions, getPoints } from '@/services/points'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useLocalizedContent } from '@/utils/i18n'

const { locale, t } = useI18n()
const { getLocalizedTitle, getLocalizedDescription } = useLocalizedContent()
const router = useRouter()
const authStore = useAuthStore()

// 用户数据
const me = ref(null)
const loading = ref(true)
const logging = ref(false)

// Tab状态
const activeTab = ref('coupons') // coupons | orders | redemptions | points

// 各Tab数据
const userCoupons = ref([])
const orders = ref([])
const redemptions = ref([])
const pointsData = ref(null)
const tabLoading = ref({})

// Tab配置
const tabs = [
  { key: 'coupons', icon: '🎫', label: t('my.coupons') || '优惠券' },
  { key: 'orders', icon: '📦', label: t('my.orders') || '我的订单' },
  { key: 'redemptions', icon: '📄', label: t('my.redemptions') || '核销记录' },
  { key: 'points', icon: '💰', label: t('my.points') || '积分' }
]

// 检查后端会话是否有效（Cookie-based认证）
async function checkBackendSession() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      return data.success === true && data.data ? data.data : null
    }
    return null
  } catch (e) {
    console.error('检查会话失败:', e)
    return null
  }
}

async function fetchMe(){
  loading.value = true
  try{
    // 使用Cookie会话检查（与HeaderMenu保持一致）
    const user = await checkBackendSession()
    if (user && user.id) {
      console.log('✅ MyCenter: 检测到登录会话:', user)
      me.value = {
        id: user.id,
        nickname: user.name || user.nickname,
        avatar: user.picture || user.avatar,
        line_id: user.lineUserId || user.line_id,
        province: user.province,
        level: user.level,
        points: user.points
      }
      
      // 🔧 关键修复：同步更新authStore，确保isAuthenticated状态正确
      authStore.me = {
        id: user.id,
        name: user.name || user.nickname,
        line_id: user.lineUserId || user.line_id,
        avatar: user.picture || user.avatar,
        province: user.province,
        level: user.level,
        points: user.points
      }
      console.log('✅ MyCenter: 已同步更新authStore状态')
    } else {
      console.log('🚫 MyCenter: 无有效会话，显示游客状态')
      me.value = null
      authStore.me = null
    }
  }catch(e){
    console.error('❌ MyCenter: 获取用户信息失败:', e)
    me.value = null
    authStore.me = null
  }finally{ 
    loading.value = false 
  }
}

async function handleLogout(){
  try {
    console.log('🚪 开始退出登录流程...')
    
    // 1. 调用后端退出接口
    await logoutUser()
    
    // 2. 清除Pinia store
    authStore.logout()
    
    // 3. 清除本地状态
    me.value = null
    
    // 4. 清除localStorage缓存
    localStorage.removeItem('user_token')
    localStorage.removeItem('liff_token')
    
    console.log('✅ 退出登录完成，即将刷新页面以清除所有状态...')
    
    // 5. 强制刷新页面以清除所有LIFF和前端状态
    setTimeout(() => {
      window.location.href = '/'
    }, 300)
  } catch (err) {
    console.error('退出登录异常:', err)
    // 即使出错也强制刷新
    setTimeout(() => {
      window.location.href = '/'
    }, 500)
  }
}

const cityText = computed(()=> provinceLabel(me.value?.province || localStorage.getItem('province') || 'bangkok', locale.value))
const levelText = computed(()=> 'L' + (me.value?.level || 1))
const pointsText = computed(()=> String(me.value?.points ?? 0))

// 切换Tab
function switchTab(tab) {
  activeTab.value = tab
  loadTabData(tab)
}

// 加载Tab数据
async function loadTabData(tab) {
  if (!authStore.isAuthenticated) return
  
  tabLoading.value[tab] = true
  
  try {
    switch(tab) {
      case 'coupons':
        const couponsRes = await getUserCoupons({ page: 1, limit: 100 })
        if (couponsRes.success) {
          userCoupons.value = couponsRes.data.coupons || []
        }
        break
      case 'orders':
        const ordersRes = await getRewardRedemptions()
        if (ordersRes && ordersRes.success && ordersRes.data) {
          orders.value = ordersRes.data.redemptions || []
        } else if (Array.isArray(ordersRes)) {
          orders.value = ordersRes
        }
        break
      case 'redemptions':
        const redemptionsRes = await getUserCoupons({ status: 'used', page: 1, limit: 100 })
        if (redemptionsRes.success) {
          redemptions.value = redemptionsRes.data.coupons || []
        }
        break
      case 'points':
        const pointsRes = await getPoints()
        if (pointsRes?.success) {
          pointsData.value = pointsRes.data
        }
        break
    }
  } catch (err) {
    console.error(`加载${tab}数据失败:`, err)
  } finally {
    tabLoading.value[tab] = false
  }
}

// 监听 authStore 状态变化
watch(() => authStore.me, (newMe) => {
  console.log('🔄 MyCenter: authStore.me 变化:', newMe)
  if (!newMe) {
    // 用户已退出，清空本地状态
    me.value = null
    console.log('✅ MyCenter: 已同步清空用户状态')
  } else if (!me.value) {
    // 状态更新，刷新用户信息
    fetchMe()
    console.log('✅ MyCenter: 检测到状态变化，刷新用户信息')
  }
})

// 监听activeTab变化
watch(activeTab, (newTab) => {
  loadTabData(newTab)
}, { immediate: false })

onMounted(() => {
  fetchMe()
  if (authStore.isAuthenticated) {
    loadTabData(activeTab.value)
  }
})

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${day}/${month}/${year}`
}

// 查看优惠券详情
function viewCoupon(item) {
  if (item.userCoupon.status === 'claimed') {
    router.push(`/my-coupon/${item.userCoupon.id}`)
  } else {
    router.push(`/coupon/${item.coupon.id}`)
  }
}
</script>

<template>
  <section class="my-center">
    <!-- 个人信息卡片 -->
    <div class="profile-card">
      <template v-if="!loading && me">
        <div class="profile-header">
          <div class="avatar-container">
            <img class="avatar" :src="me.avatar || ''" alt="头像" @error="($event.target.src='https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg')"/>
          </div>
          <div class="user-info">
            <div class="username">{{ me.nickname || 'User' }}</div>
            <div class="user-meta">
              <span class="level-badge">{{ levelText }}</span>
              <span class="city">{{ cityText }}</span>
            </div>
          </div>
          <button class="logout-btn" @click="handleLogout" :title="t('my.logout') || '退出登录'">
            <svg class="logout-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
              <polyline points="16,17 21,12 16,7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
        <div class="points-row">
          <div class="points-section">
            <div class="points-value">{{ pointsText }}</div>
            <div class="points-label">{{ t('my.points') || '积分' }}</div>
          </div>
        </div>
      </template>

      <template v-else-if="!loading && !me">
        <div class="profile-header guest">
          <div class="avatar guest-avatar">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="12" r="5" fill="#d1d5db"/>
              <path d="M6 26c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="#d1d5db" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div class="user-info">
            <div class="username">{{ t('my.guestUser') || '游客用户' }}</div>
            <div class="login-prompt">{{ t('my.pleaseLogin') || '请登录后使用完整功能' }}</div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="profile-header loading">
          <div class="avatar skeleton"></div>
          <div class="user-info">
            <div class="skeleton-line name"></div>
            <div class="skeleton-line meta"></div>
          </div>
        </div>
      </template>
    </div>

    <!-- Tab切换栏 -->
    <div class="tabs-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-button"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab内容区 -->
    <div class="tab-content">
      <!-- 优惠券 -->
      <div v-if="activeTab === 'coupons'" class="content-panel">
        <div v-if="tabLoading.coupons" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="!authStore.isAuthenticated" class="empty-state">
          <div class="empty-icon">🎫</div>
          <p>请先登录查看优惠券</p>
        </div>
        <div v-else-if="userCoupons.length === 0" class="empty-state">
          <div class="empty-icon">🎫</div>
          <p>暂无优惠券</p>
        </div>
        <div v-else class="coupon-list">
          <div v-for="item in userCoupons" :key="item.userCoupon.id" class="coupon-item" @click="viewCoupon(item)">
            <div class="coupon-title">{{ getLocalizedTitle(item.coupon) }}</div>
            <div class="coupon-meta">
              <span class="status">{{ item.userCoupon.status === 'claimed' ? '可用' : item.userCoupon.status === 'used' ? '已使用' : '已过期' }}</span>
              <span class="date">{{ formatDate(item.userCoupon.claimed_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 订单 -->
      <div v-else-if="activeTab === 'orders'" class="content-panel">
        <div v-if="tabLoading.orders" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="!authStore.isAuthenticated" class="empty-state">
          <div class="empty-icon">📦</div>
          <p>请先登录查看订单</p>
        </div>
        <div v-else-if="orders.length === 0" class="empty-state">
          <div class="empty-icon">📦</div>
          <p>暂无订单</p>
        </div>
        <div v-else class="order-list">
          <div v-for="order in orders" :key="order.id" class="order-item">
            <div class="order-title">{{ order.reward_item_name || '礼品' }}</div>
            <div class="order-meta">
              <span class="points">{{ order.points_spent }}积分</span>
              <span class="date">{{ formatDate(order.redeemed_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 核销记录 -->
      <div v-else-if="activeTab === 'redemptions'" class="content-panel">
        <div v-if="tabLoading.redemptions" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="!authStore.isAuthenticated" class="empty-state">
          <div class="empty-icon">📄</div>
          <p>请先登录查看核销记录</p>
        </div>
        <div v-else-if="redemptions.length === 0" class="empty-state">
          <div class="empty-icon">📄</div>
          <p>暂无核销记录</p>
        </div>
        <div v-else class="redemption-list">
          <div v-for="item in redemptions" :key="item.userCoupon.id" class="redemption-item">
            <div class="redemption-title">{{ getLocalizedTitle(item.coupon) }}</div>
            <div class="redemption-meta">
              <span class="store">{{ item.store?.name || '门店' }}</span>
              <span class="date">{{ formatDate(item.userCoupon.redeemed_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 积分 -->
      <div v-else-if="activeTab === 'points'" class="content-panel">
        <div v-if="tabLoading.points" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="!authStore.isAuthenticated" class="empty-state">
          <div class="empty-icon">💰</div>
          <p>请先登录查看积分</p>
        </div>
        <div v-else class="points-panel">
          <div class="points-balance">
            <div class="balance-number">{{ pointsData?.balance || 0 }}</div>
            <div class="balance-label">可用积分</div>
          </div>
          <div class="points-info">
            <p>💡 100积分 = 1泰铢</p>
            <p>📅 365天有效期</p>
            <button class="mall-btn" @click="$router.push('/rewards')">
              前往积分商城
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.my-center {
  padding: 12px;
  background: #f8f9fa;
  min-height: 100vh;
  padding-bottom: calc(var(--bottom-nav-h, 64px) + 12px);
}

.profile-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,.1);
  margin-bottom: 16px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.profile-header.guest {
  margin-bottom: 12px;
}

.avatar-container {
  flex-shrink: 0;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  background: #f0f0f0;
}

.guest-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.username {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.login-prompt {
  font-size: 13px;
  color: #6b7280;
}

.user-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.level-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.city {
  font-size: 13px;
  color: #6b7280;
}

.logout-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.logout-btn:hover {
  color: #ef4444;
}

.points-row {
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.points-section {
  text-align: center;
}

.points-value {
  font-size: 24px;
  font-weight: 700;
  color: #f59e0b;
  margin-bottom: 4px;
}

.points-label {
  font-size: 13px;
  color: #6b7280;
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.skeleton-line {
  height: 16px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-line.name {
  width: 120px;
}

.skeleton-line.meta {
  width: 80px;
  height: 12px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Tab切换栏 */
.tabs-bar {
  display: flex;
  background: #fff;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,.1);
}

.tab-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: #6b7280;
}

.tab-button.active {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8533 100%);
  color: white;
}

.tab-icon {
  font-size: 24px;
}

.tab-label {
  font-weight: 500;
}

/* Tab内容区 */
.tab-content {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  min-height: 300px;
  box-shadow: 0 2px 8px rgba(0,0,0,.1);
}

.content-panel {
  min-height: 250px;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #ff6b35;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

/* 优惠券列表 */
.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coupon-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.coupon-item:hover {
  background: #e5e7eb;
  transform: translateX(4px);
}

.coupon-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.coupon-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b7280;
}

/* 订单列表 */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.order-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.order-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b7280;
}

.order-meta .points {
  color: #f59e0b;
  font-weight: 600;
}

/* 核销记录列表 */
.redemption-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.redemption-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.redemption-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.redemption-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b7280;
}

/* 积分面板 */
.points-panel {
  padding: 20px;
}

.points-balance {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #ff6a00 0%, #ff8533 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 24px;
}

.balance-number {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 8px;
}

.balance-label {
  font-size: 16px;
  opacity: 0.9;
}

.points-info {
  text-align: center;
}

.points-info p {
  margin: 8px 0;
  color: #6b7280;
  font-size: 14px;
}

.mall-btn {
  margin-top: 20px;
  padding: 12px 32px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8533 100%);
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.mall-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
}
</style>
