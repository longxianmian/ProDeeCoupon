<template>
  <div class="my-coupons">
    <van-nav-bar 
      :title="$t('nav.myCoupons')"
      left-arrow
      @click-left="$router.back()"
    />
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <van-loading size="24px" vertical>
        正在加载...
      </van-loading>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <van-empty 
        image="error" 
        :description="error"
      >
        <van-button 
          round 
          type="primary" 
          @click="loadUserCoupons"
        >
          重新加载
        </van-button>
      </van-empty>
    </div>

    <!-- 优惠券列表 -->
    <div v-else-if="userCoupons.length > 0" class="coupon-list">
      <div 
        v-for="item in userCoupons" 
        :key="item.userCoupon.id"
        class="coupon-card"
        @click="viewCouponDetail(item)"
      >
        <div class="coupon-content">
          <!-- 优惠券状态标签 -->
          <div class="status-badge" :class="getStatusClass(item.userCoupon.status)">
            {{ getStatusText(item.userCoupon.status) }}
          </div>
          
          <!-- 优惠券信息 -->
          <div class="coupon-info">
            <h3 class="title">{{ item.coupon.title }}</h3>
            <div class="price-info">
              <span class="original-price">原价: ¥{{ item.coupon.original_price }}</span>
              <span class="discount-price">特价: ¥{{ item.coupon.discount_price }}</span>
            </div>
            <div class="meta-info">
              <span class="claimed-date">
                领取时间: {{ formatDate(item.userCoupon.created_at) }}
              </span>
              <span class="valid-until">
                有效期至: {{ formatDate(item.coupon.valid_to) }}
              </span>
            </div>
          </div>

          <!-- 核销码 -->
          <div v-if="item.userCoupon.status === 'claimed'" class="redemption-info">
            <div class="redemption-code">
              核销码: {{ item.userCoupon.redemption_code }}
            </div>
            <van-button 
              size="small" 
              type="primary" 
              @click.stop="showQRCode(item)"
            >
              显示二维码
            </van-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-container">
      <van-empty 
        image="coupon" 
        description="您还没有领取任何优惠券"
      >
        <van-button 
          round 
          type="primary" 
          @click="goToHome"
        >
          去逛逛
        </van-button>
      </van-empty>
    </div>

    <!-- 二维码弹窗 -->
    <van-popup 
      v-model:show="showQR" 
      round 
      closeable
      position="center"
      style="padding: 20px; text-align: center;"
    >
      <div v-if="selectedCoupon" class="qr-modal">
        <h3>{{ selectedCoupon.coupon.title }}</h3>
        <div class="qr-code">
          <img 
            :src="selectedCoupon.userCoupon.qr_code_url" 
            alt="优惠券二维码"
            style="width: 200px; height: 200px;"
          />
        </div>
        <p class="redemption-code">
          核销码: {{ selectedCoupon.userCoupon.redemption_code }}
        </p>
        <p class="tip">请向店员出示此二维码进行核销</p>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { userApi } from '@/api/user.js'
import { showToast, showNotify } from 'vant'

export default defineComponent({
  name: 'MyCoupons',
  setup() {
    const router = useRouter()
    const loading = ref(false)
    const error = ref('')
    const userCoupons = ref([])
    const showQR = ref(false)
    const selectedCoupon = ref(null)

    // 加载用户优惠券
    const loadUserCoupons = async () => {
      loading.value = true
      error.value = ''
      
      try {
        const response = await userApi.getUserCoupons()
        if (response.success) {
          // 修复API响应结构不匹配：服务器返回{coupons: [...], pagination: {...}}对象
          userCoupons.value = response.data.coupons || response.data || []
          console.log('✅ 用户优惠券加载成功:', response.data)
        } else {
          error.value = response.error || '获取优惠券失败'
        }
      } catch (err) {
        console.error('❌ 获取用户优惠券失败:', err)
        if (err.response?.status === 401) {
          error.value = '请先登录'
          // LIFF登录逻辑可以在这里添加
        } else {
          error.value = '网络错误，请稍后重试'
        }
      } finally {
        loading.value = false
      }
    }

    // 获取状态文本
    const getStatusText = (status) => {
      const statusMap = {
        'claimed': '可使用',
        'redeemed': '已使用',
        'expired': '已过期'
      }
      return statusMap[status] || status
    }

    // 获取状态样式类
    const getStatusClass = (status) => {
      return `status-${status}`
    }

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 查看优惠券详情
    const viewCouponDetail = (item) => {
      router.push(`/coupon/${item.coupon.id}`)
    }

    // 显示二维码
    const showQRCode = (item) => {
      selectedCoupon.value = item
      showQR.value = true
    }

    // 回到首页
    const goToHome = () => {
      router.push('/')
    }

    // 组件挂载时加载数据
    onMounted(() => {
      loadUserCoupons()
    })

    return {
      loading,
      error,
      userCoupons,
      showQR,
      selectedCoupon,
      loadUserCoupons,
      getStatusText,
      getStatusClass,
      formatDate,
      viewCouponDetail,
      showQRCode,
      goToHome
    }
  }
})
</script>

<style scoped>
.my-coupons {
  min-height: 100vh;
  background: #f5f5f5;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 20px;
}

.coupon-list {
  padding: 16px;
}

.coupon-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s;
}

.coupon-card:hover {
  transform: translateY(-2px);
}

.coupon-content {
  padding: 16px;
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-claimed {
  background: #e8f5e8;
  color: #52c41a;
}

.status-redeemed {
  background: #f0f0f0;
  color: #666;
}

.status-expired {
  background: #fff1f0;
  color: #ff4d4f;
}

.coupon-info {
  margin-right: 80px;
}

.title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.price-info {
  margin: 8px 0;
}

.original-price {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
  margin-right: 12px;
}

.discount-price {
  font-size: 16px;
  color: #ff6b35;
  font-weight: bold;
}

.meta-info {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.claimed-date,
.valid-until {
  font-size: 12px;
  color: #666;
}

.redemption-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.redemption-code {
  font-size: 14px;
  color: #333;
  font-weight: bold;
  font-family: monospace;
}

.qr-modal h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.qr-code {
  margin: 16px 0;
}

.qr-code img {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
}

.tip {
  margin: 16px 0 0 0;
  font-size: 14px;
  color: #666;
}
</style>