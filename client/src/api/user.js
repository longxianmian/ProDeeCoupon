import axios from 'axios'

// 获取用户token（从localStorage或其他来源）
const getUserToken = () => {
  return localStorage.getItem('user_token')
}

// 配置axios默认设置
const userApiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
})

// 请求拦截器：添加token
userApiClient.interceptors.request.use(
  (config) => {
    const token = getUserToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理错误
userApiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // token过期或无效，清除本地存储
      localStorage.removeItem('user_token')
      localStorage.removeItem('user_profile')
      
      // 重定向到首页或登录
      if (window.location.pathname !== '/') {
        console.log('🔑 用户Token已过期，重定向到首页')
        window.location.replace('/')
      }
    }
    return Promise.reject(error)
  }
)

export const userApi = {
  // 获取当前用户信息
  async getCurrentUser() {
    try {
      const response = await userApiClient.get('/auth/me')
      return response.data
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  },

  // 获取用户已领取的优惠券
  async getUserCoupons() {
    try {
      const response = await userApiClient.get('/auth/me/coupons')
      return response.data
    } catch (error) {
      console.error('获取用户优惠券失败:', error)
      throw error
    }
  },

  // 获取单个用户优惠券详情（用于核销页面）
  async getUserCouponDetail(userCouponId) {
    try {
      const response = await userApiClient.get(`/auth/me/coupons/${userCouponId}`)
      return response.data
    } catch (error) {
      console.error('获取用户优惠券详情失败:', error)
      throw error
    }
  },

  // 更新用户信息
  async updateUser(userData) {
    try {
      const response = await userApiClient.put('/auth/me', userData)
      return response.data
    } catch (error) {
      console.error('更新用户信息失败:', error)
      throw error
    }
  },

  // 获取优惠券详情
  async getCouponDetail(couponId) {
    try {
      const response = await userApiClient.get(`/coupons/${couponId}`)
      return response
    } catch (error) {
      console.error('获取优惠券详情失败:', error)
      throw error
    }
  },

  // 领取优惠券
  async claimCoupon(couponId) {
    try {
      const response = await userApiClient.post(`/coupons/${couponId}/claim`)
      return response
    } catch (error) {
      console.error('领取优惠券失败:', error)
      throw error
    }
  },

  // 获取所有优惠券列表（首页用）
  async getAllCoupons() {
    try {
      const response = await userApiClient.get('/coupons')
      return response
    } catch (error) {
      console.error('获取优惠券列表失败:', error)
      throw error
    }
  }
}

export default userApi