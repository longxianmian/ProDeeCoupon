<template>
  <div class="coupon-detail">
    <!-- 导航栏 -->
    <div class="nav-header">
      <button class="back-btn" @click="$router.back()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <h1 class="nav-title">{{ t('coupon.detail') }}</h1>
    </div>
    
    <van-loading v-if="loading" class="loading-container" />
    
    <div v-else-if="coupon" class="content">
      <!-- 顶部轮播图区域 -->
      <div class="carousel-section">
        <van-swipe
          class="carousel-swipe"
          :autoplay="3000"
          :show-indicators="getImageList().length > 1"
          indicator-color="rgba(255, 255, 255, 0.5)"
          indicator-active-color="white"
          @change="onCarouselChange"
        >
          <van-swipe-item 
            v-for="(image, index) in getImageList()" 
            :key="index"
            class="carousel-item"
          >
            <div class="carousel-image">
              <img 
                v-if="image" 
                :src="image" 
                :alt="coupon.title" 
              />
              <div v-else class="placeholder-image">
                <div class="placeholder-icon">🎫</div>
              </div>
            </div>
          </van-swipe-item>
        </van-swipe>
      </div>

      <!-- 优惠券信息区 -->
      <div class="coupon-info-section">
        <div class="coupon-title">
          <h2>{{ coupon.title }}</h2>
          <div class="discount-badge" v-if="getBadgeText()">
            {{ getBadgeText() }}
          </div>
        </div>
        <div class="coupon-subtitle">
          {{ getCouponSubtitle() }}
        </div>
        
        <!-- 动态价格显示区域 -->
        <div class="price-comparison" v-if="getPricingDisplay()">
          <div 
            v-for="(priceInfo, index) in getPricingDisplay()" 
            :key="index"
            class="price-card"
            :class="priceInfo.class"
          >
            <div class="price-label">{{ priceInfo.label }}</div>
            <div class="price-value" :class="priceInfo.valueClass">{{ priceInfo.value }}</div>
          </div>
        </div>
        
        <!-- 有效期 -->
        <div class="validity-info">
          <span class="validity-label">{{ t('coupon.validPeriod') }}：</span>
          <span class="validity-period">{{ getValidityPeriod() }}</span>
        </div>
      </div>

      <!-- 最近门店列表 -->
      <div class="stores-section" v-if="coupon.stores && coupon.stores.length > 0">
        <h3 class="section-title">{{ t('coupon.nearbyStores') }}</h3>
        <div class="stores-list">
          <div 
            v-for="store in coupon.stores.slice(0, 3)" 
            :key="store.id" 
            class="store-card"
          >
            <div class="store-icon">
              <div class="store-avatar">
                <span>{{ getStoreInitial(store.name) }}</span>
              </div>
            </div>
            <div class="store-details">
              <h4 class="store-name">{{ store.name }}</h4>
              <p class="store-distance" v-if="Number.isFinite(Number(store.distance))">
                {{ t('coupon.distanceFormat', { distance: Number(store.distance).toFixed(1) }) }}
              </p>
            </div>
            <button class="nav-btn" @click="navigateToStore(store)">
              {{ t('coupon.navigation') }}
            </button>
          </div>
        </div>
        <div class="stores-note" v-if="coupon.stores.length > 0">
          {{ t('coupon.recommendedByLocation') }}
        </div>
      </div>
      
      <!-- 使用规则 -->
      <div class="rules-section">
        <div class="rules-header" @click="toggleRules">
          <span>{{ t('coupon.usageRules') }}</span>
          <svg 
            class="rules-arrow" 
            :class="{ expanded: rulesExpanded }"
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="rules-content" v-show="rulesExpanded">
          <div class="rules-text">
            <div v-if="coupon.terms">
              <p v-for="line in coupon.terms.split('\n')" :key="line">• {{ line }}</p>
            </div>
            <div v-else>
              <p>• {{ t('coupon.defaultRules.storeOnly') }}</p>
              <p>• {{ t('coupon.defaultRules.noStack') }}</p>
              <p>• {{ t('coupon.defaultRules.onePerPerson') }}</p>
              <p>• {{ t('coupon.defaultRules.noTransfer') }}</p>
            </div>
            <p v-if="coupon.description">• {{ coupon.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="error-state">
      <van-empty :description="t('coupon.notFound')" />
    </div>

    <!-- 底部领取按钮 -->
    <div v-if="coupon" class="action-footer">
      <van-button 
        type="primary" 
        size="large" 
        block 
        :disabled="!canClaim"
        :loading="claiming"
        @click="claimCoupon"
      >
        {{ claimButtonText }}
      </van-button>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

export default defineComponent({
  name: 'CouponDetail',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const { t } = useI18n()
    const coupon = ref(null)
    const loading = ref(true)
    const claiming = ref(false)
    const userLocation = ref(null)
    const rulesExpanded = ref(false)
    const currentCarouselIndex = ref(0)

    // 计算属性
    const canClaim = computed(() => {
      if (!coupon.value) return false
      const remaining = coupon.value.quantity - coupon.value.claimed_count
      const isActive = coupon.value.status === 'active'
      const notExpired = new Date(coupon.value.valid_to) > new Date()
      return remaining > 0 && isActive && notExpired
    })

    const claimButtonText = computed(() => {
      if (!coupon.value) return t('coupon.loading')
      if (claiming.value) return t('coupon.claiming')
      if (!canClaim.value) {
        if (coupon.value.quantity - coupon.value.claimed_count <= 0) return t('coupon.soldOut')
        if (new Date(coupon.value.valid_to) <= new Date()) return t('coupon.expired')
        return t('coupon.notAvailable')
      }
      return t('coupon.claimNow')
    })

    // 获取用户位置
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            userLocation.value = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
            // 重新获取优惠券数据以包含距离计算
            fetchCouponDetail()
          },
          error => {
            console.log('获取位置失败:', error)
            fetchCouponDetail() // 没有位置信息也继续加载
          }
        )
      } else {
        fetchCouponDetail()
      }
    }

    // 获取优惠券详情
    const fetchCouponDetail = async () => {
      try {
        loading.value = true
        const couponId = route.params.id
        
        const params = {}
        if (userLocation.value) {
          params.lat = userLocation.value.lat
          params.lng = userLocation.value.lng
        }
        
        const response = await axios.get(`/api/coupons/${couponId}`, { params })
        
        if (response.data.success) {
          coupon.value = response.data.data
        } else {
          console.error('获取优惠券详情失败:', response.data.error)
        }
      } catch (error) {
        console.error('获取优惠券详情异常:', error)
      } finally {
        loading.value = false
      }
    }

    // 领取优惠券
    const claimCoupon = async () => {
      if (!canClaim.value || claiming.value) return
      
      try {
        claiming.value = true
        console.log('🎫 开始领取优惠券流程...')
        
        // 导入安全的LIFF服务
        const { default: liffService } = await import('../services/liffServiceSecure.js')
        
        // 步骤1：初始化LIFF
        await liffService.init()
        
        // 步骤2：检查登录状态并登录
        if (!liffService.isLoggedIn()) {
          console.log('👤 用户未登录，开始登录流程...')
          await liffService.login()
        }
        
        // 步骤3：获取安全验证信息（包含ID Token）
        const secureVerification = await liffService.verifyUserSecurely()
        
        // 步骤4：检查并要求关注官方账号
        const followResult = await liffService.followOfficialAccount()
        if (!followResult.success && followResult.needFollow) {
          // 显示关注提示
          console.log('📢 需要关注官方账号')
          
          // 如果有可用的一键关注操作，给用户选择
          if (followResult.actionTaken) {
            const shouldRetry = confirm(`${followResult.message}\n\n点击"确定"等待关注完成后重试，点击"取消"稍后再试`)
            if (shouldRetry) {
              // 等待一段时间后重新检查关注状态
              setTimeout(async () => {
                const recheckResult = await liffService.recheckFollowStatus()
                if (recheckResult.success) {
                  // 关注成功，继续领取流程
                  claiming.value = true
                  claimCoupon()
                } else {
                  alert('请确保已关注官方账号后重试')
                }
              }, 3000)
            }
          } else {
            alert(followResult.message)
          }
          return
        }
        
        // 步骤5：调用后端API领取优惠券（使用LIFF ID Token进行安全认证）
        const couponId = route.params.id
        const claimResponse = await axios.post(`/api/coupons/${couponId}/claim`, {}, {
          headers: {
            'Authorization': `Bearer ${secureVerification.idToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (claimResponse.data.success) {
          console.log('🎉 优惠券领取成功!')
          
          // 步骤6：获取JWT token用于后续API调用
          console.log('🔑 获取用户JWT token...')
          try {
            const tokenResponse = await axios.post('/api/auth/liff/exchange-token', {
              id_token: secureVerification.idToken
            })
            
            if (tokenResponse.data.success) {
              // 存储JWT token和用户信息
              const { token, user } = tokenResponse.data.data
              localStorage.setItem('user_token', token)
              localStorage.setItem('user_profile', JSON.stringify(user))
              console.log('✅ JWT token获取并存储成功')
            } else {
              console.warn('⚠️ JWT token获取失败，但优惠券已领取成功')
            }
          } catch (tokenError) {
            console.error('❌ JWT token获取失败:', tokenError)
            // 即使token获取失败，优惠券也已经领取成功了
          }
          
          // 发送使用统计
          await liffService.sendUsageEvent('coupon_claimed', {
            coupon_id: coupon.value.id,
            coupon_title: coupon.value.title
          })
          
          // 显示成功提示并跳转到个人中心
          alert(`🎉 优惠券领取成功！\n\n${claimResponse.data.message || '优惠券已添加到您的账户'}\n\n即将跳转到个人中心查看您的优惠券。`)
          
          // 跳转到个人中心
          router.push('/my-coupons')
        } else {
          throw new Error(claimResponse.data.error || '领取失败')
        }
        
      } catch (error) {
        console.error('❌ 领取优惠券失败:', error)
        alert(`领取失败: ${error.message}`)
      } finally {
        claiming.value = false
      }
    }

    // 导航到门店
    const navigateToStore = (store) => {
      if (store.lat && store.lng) {
        // 使用Google Maps
        const url = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}&destination_place_id=${store.google_place_id || ''}`
        window.open(url, '_blank')
      }
    }

    // 格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    // 切换使用规则显示
    const toggleRules = () => {
      rulesExpanded.value = !rulesExpanded.value
    }
    
    // 获取主图片
    const getMainImage = () => {
      if (coupon.value?.image_url) {
        return coupon.value.image_url
      }
      if (coupon.value?.media_files && coupon.value.media_files.length > 0) {
        const imageFile = coupon.value.media_files.find(file => file.type === 'image')
        return imageFile ? imageFile.url : null
      }
      return null
    }
    
    // 获取图片列表（用于轮播）
    const getImageList = () => {
      const images = []
      if (coupon.value?.image_url) {
        images.push(coupon.value.image_url)
      }
      if (coupon.value?.media_files) {
        coupon.value.media_files.forEach(file => {
          if (file.type === 'image' && file.url !== coupon.value.image_url) {
            images.push(file.url)
          }
        })
      }
      return images.length > 0 ? images : [null] // 至少有一个占位符
    }
    
    // 计算折扣百分比
    const getDiscountPercent = () => {
      if (!coupon.value) return 0
      const original = parseFloat(coupon.value.original_price)
      const discount = parseFloat(coupon.value.discount_price)
      if (!original || original <= 0 || !discount || discount < 0) return 0
      const percent = Math.round((1 - discount / original) * 100)
      return Math.max(0, Math.min(100, percent)) // 限制在0-100范围
    }
    
    // 获取优惠券副标题
    const getCouponSubtitle = () => {
      if (!coupon.value) return ''
      const remaining = coupon.value.quantity - coupon.value.claimed_count
      return t('coupon.remaining', { count: remaining })
    }
    
    // 获取有效期文本
    const getValidityPeriod = () => {
      if (!coupon.value) return ''
      const startDate = new Date(coupon.value.valid_from).toLocaleDateString('zh-CN')
      const endDate = new Date(coupon.value.valid_to).toLocaleDateString('zh-CN')
      return `${startDate} — ${endDate}`
    }
    
    // 获取门店名称首字母
    const getStoreInitial = (storeName) => {
      if (!storeName) return 'S'
      // 提取第一个字符，如果是中文则返回第一个字，如果是英文则返回第一个字母
      return storeName.charAt(0).toUpperCase()
    }
    
    // 获取徽章文本
    const getBadgeText = () => {
      if (!coupon.value) return ''
      
      const type = coupon.value.coupon_type || 'final_price'
      const currency = coupon.value.currency || 'THB'
      
      switch (type) {
        case 'final_price':
          const percent = getDiscountPercent()
          return percent > 0 ? `${percent}% OFF` : ''
        case 'gift_card':
          return t('coupon.giftCardBadge')
        case 'cash_voucher':
          return t('coupon.cashVoucherBadge')
        case 'full_reduction':
          return t('coupon.fullReductionBadge')
        case 'percentage_discount':
          return `${coupon.value.discount_percent || 0}% OFF`
        case 'fixed_discount':
          return t('coupon.fixedDiscountBadge')
        default:
          return ''
      }
    }
    
    // 获取动态价格显示
    const getPricingDisplay = () => {
      if (!coupon.value) return []
      
      const type = coupon.value.coupon_type || 'final_price'
      const currency = coupon.value.currency || 'THB'
      const currencySymbol = currency === 'CNY' ? '¥' : '฿'
      
      switch (type) {
        case 'final_price':
          if (!coupon.value.original_price || !coupon.value.discount_price) {
            return [{
              label: t('coupon.finalPrice'),
              value: `${currencySymbol}${coupon.value.price_final || 0}`,
              class: 'discount',
              valueClass: 'orange'
            }]
          }
          return [
            {
              label: t('coupon.originalPrice'),
              value: `${currencySymbol}${coupon.value.original_price}`,
              class: 'original',
              valueClass: ''
            },
            {
              label: t('coupon.discountPrice'),
              value: `${currencySymbol}${coupon.value.discount_price}`,
              class: 'discount',
              valueClass: 'orange'
            }
          ]
          
        case 'gift_card':
          return [{
            label: t('coupon.giftCardValue'),
            value: `${currencySymbol}${coupon.value.face_value || 0}`,
            class: 'gift-card',
            valueClass: 'orange'
          }]
          
        case 'cash_voucher':
          return [{
            label: t('coupon.voucherValue'),
            value: `${currencySymbol}${coupon.value.amount_off || 0}`,
            class: 'voucher',
            valueClass: 'orange'
          }]
          
        case 'full_reduction':
          const displays = []
          if (coupon.value.min_spend) {
            displays.push({
              label: t('coupon.minSpend'),
              value: `${currencySymbol}${coupon.value.min_spend}`,
              class: 'condition',
              valueClass: ''
            })
          }
          displays.push({
            label: t('coupon.reduceAmount'),
            value: `${currencySymbol}${coupon.value.amount_off || 0}`,
            class: 'reduction',
            valueClass: 'orange'
          })
          return displays
          
        case 'percentage_discount':
          const percentDisplays = [{
            label: t('coupon.discountRate'),
            value: `${coupon.value.discount_percent || 0}%`,
            class: 'percentage',
            valueClass: 'orange'
          }]
          if (coupon.value.cap_amount) {
            percentDisplays.push({
              label: t('coupon.maxDiscount'),
              value: `${currencySymbol}${coupon.value.cap_amount}`,
              class: 'cap',
              valueClass: ''
            })
          }
          return percentDisplays
          
        case 'fixed_discount':
          return [{
            label: t('coupon.discountAmount'),
            value: `${currencySymbol}${coupon.value.amount_off || 0}`,
            class: 'fixed-discount',
            valueClass: 'orange'
          }]
          
        default:
          return []
      }
    }
    
    // 轮播图变化事件
    const onCarouselChange = (index) => {
      currentCarouselIndex.value = index
    }

    onMounted(() => {
      getUserLocation()
    })

    return {
      // 数据
      coupon,
      loading,
      claiming,
      rulesExpanded,
      currentCarouselIndex,
      // 计算属性
      canClaim,
      claimButtonText,
      // 方法
      claimCoupon,
      navigateToStore,
      formatDate,
      toggleRules,
      getMainImage,
      getImageList,
      getDiscountPercent,
      getCouponSubtitle,
      getValidityPeriod,
      getStoreInitial,
      onCarouselChange,
      getBadgeText,
      getPricingDisplay,
      // 翻译函数
      t
    }
  }
})
</script>

<style scoped>
.coupon-detail {
  min-height: 100vh;
  background: #f8f9fa;
  padding-bottom: 80px;
}

/* 导航栏 */
.nav-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #ebedf0;
}

.back-btn {
  padding: 8px;
  margin-right: 12px;
  border: none;
  background: none;
  color: #323233;
  cursor: pointer;
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
  margin: 0;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.content {
  padding: 0;
}

/* 轮播图区域 */
.carousel-section {
  background: white;
  margin-bottom: 16px;
}

.carousel-swipe {
  height: 280px;
  background: #000;
}

.carousel-item {
  height: 100%;
}

.carousel-image {
  width: 100%;
  height: 100%;
}

.carousel-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #000;
}

.placeholder-icon {
  font-size: 48px;
  color: #666;
}

/* Vant Swipe 组件样式覆盖 */
.carousel-swipe .van-swipe__indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.carousel-swipe .van-swipe__indicators {
  bottom: 20px;
}

/* 优惠券信息区 */
.coupon-info-section {
  background: white;
  padding: 20px;
  margin-bottom: 16px;
}

.coupon-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.coupon-title h2 {
  font-size: 24px;
  font-weight: 700;
  color: #323233;
  margin: 0;
}

.discount-badge {
  background: #ff4444;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.coupon-subtitle {
  font-size: 16px;
  color: #969799;
  margin-bottom: 24px;
}

.price-comparison {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.price-card {
  flex: 1;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.price-card.original {
  background: #f7f8fa;
}

.price-card.discount {
  background: #fff7f0;
  border: 2px solid #ff6600;
}

.price-card.gift-card {
  background: #f0f9ff;
  border: 2px solid #0ea5e9;
}

.price-card.voucher {
  background: #f0fdf4;
  border: 2px solid #22c55e;
}

.price-card.condition {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.price-card.reduction {
  background: #fff7f0;
  border: 2px solid #ff6600;
}

.price-card.percentage {
  background: #fef3f2;
  border: 2px solid #ef4444;
}

.price-card.cap {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.price-card.fixed-discount {
  background: #fff7f0;
  border: 2px solid #ff6600;
}

.price-label {
  font-size: 14px;
  color: #646566;
  margin-bottom: 8px;
}

.price-value {
  font-size: 20px;
  font-weight: 700;
  color: #323233;
}

.price-value.orange {
  color: #ff6600;
}

.validity-info {
  font-size: 14px;
  color: #646566;
}

.validity-label {
  font-weight: 500;
}

.validity-period {
  color: #323233;
}

/* 门店列表 */
.stores-section {
  background: white;
  padding: 20px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
  margin: 0 0 16px 0;
}

.stores-list {
  margin-bottom: 12px;
}

.store-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 12px;
}

.store-card:last-child {
  margin-bottom: 0;
}

.store-icon {
  margin-right: 16px;
}

.store-avatar {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #666;
}

.store-details {
  flex: 1;
}

.store-name {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin: 0 0 4px 0;
}

.store-distance {
  font-size: 14px;
  color: #969799;
  margin: 0;
}

.nav-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  color: #323233;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #f8f9fa;
}

.stores-note {
  font-size: 12px;
  color: #969799;
  text-align: center;
}

/* 使用规则 */
.rules-section {
  background: white;
  margin-bottom: 16px;
}

.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: #323233;
}

.rules-arrow {
  transition: transform 0.3s;
  color: #969799;
}

.rules-arrow.expanded {
  transform: rotate(180deg);
}

.rules-content {
  border-top: 1px solid #ebedf0;
}

.rules-text {
  padding: 16px 20px;
}

.rules-text p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #646566;
  line-height: 1.5;
}

.rules-text p:last-child {
  margin-bottom: 0;
}

.error-state {
  padding: 40px 20px;
  text-align: center;
}

.action-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 30px;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.action-footer .van-button {
  height: 56px;
  font-size: 18px;
  font-weight: 600;
  background: #ff6600;
  border: none;
  border-radius: 28px;
}

.action-footer .van-button:not(.van-button--disabled) {
  background: #ff6600;
  border-color: #ff6600;
}

.action-footer .van-button:not(.van-button--disabled):active {
  background: #e55a00;
  border-color: #e55a00;
}
</style>