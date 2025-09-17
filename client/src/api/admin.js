import axios from 'axios'

// 获取管理员token
const getAdminToken = () => {
  return localStorage.getItem('admin_token')
}

// 配置axios默认设置
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器：添加token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAdminToken()
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
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // token过期或无效，清除本地存储
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      
      // 使用replace避免闪退，并确保是完整路径
      if (window.location.pathname !== '/admin/login') {
        console.log('🔑 Token已过期，重定向到登录页')
        window.location.replace('/admin/login')
      }
    }
    return Promise.reject(error)
  }
)

export const adminApi = {
  // 管理员登录 - 不使用认证拦截器
  async login(credentials) {
    try {
      // 创建独立的axios实例，不包含认证头
      const loginClient = axios.create({
        baseURL: '/api',
        timeout: 10000
      })
      
      const response = await loginClient.post('/admin/login', credentials)
      return response.data
    } catch (error) {
      console.error('管理员登录失败:', error)
      throw error
    }
  },

  // 门店管理
  async getStores(params = {}) {
    try {
      const response = await apiClient.get('/admin/stores', { params })
      return response.data
    } catch (error) {
      console.error('获取门店列表失败:', error)
      throw error
    }
  },

  async createStore(storeData) {
    try {
      const response = await apiClient.post('/admin/stores', storeData)
      return response.data
    } catch (error) {
      console.error('创建门店失败:', error)
      throw error
    }
  },

  async updateStore(storeId, storeData) {
    try {
      const response = await apiClient.put(`/admin/stores/${storeId}`, storeData)
      return response.data
    } catch (error) {
      console.error('更新门店失败:', error)
      throw error
    }
  },

  async deleteStore(storeId) {
    try {
      const response = await apiClient.delete(`/admin/stores/${storeId}`)
      return response.data
    } catch (error) {
      console.error('删除门店失败:', error)
      throw error
    }
  },

  // 员工预设管理 (方案D)
  async getStaffPresets(storeId) {
    try {
      const response = await apiClient.get(`/admin/stores/${storeId}/staff-presets`)
      return response.data
    } catch (error) {
      console.error('获取员工预设列表失败:', error)
      throw error
    }
  },

  async addStaffPresets(storeId, staffList) {
    try {
      const response = await apiClient.post(`/admin/stores/${storeId}/staff-presets`, { staffList })
      return response.data
    } catch (error) {
      console.error('添加员工预设失败:', error)
      throw error
    }
  },

  // 生成员工绑定二维码
  async generateStoreBindingQR(storeId) {
    try {
      const response = await apiClient.get(`/admin/stores/${storeId}/binding-qr`)
      return response.data
    } catch (error) {
      console.error('生成员工绑定二维码失败:', error)
      throw error
    }
  },

  async deleteStaffPreset(presetId) {
    try {
      const response = await apiClient.delete(`/admin/staff-presets/${presetId}`)
      return response.data
    } catch (error) {
      console.error('删除员工预设失败:', error)
      throw error
    }
  },

  // 用户管理
  async getUsers(params = {}) {
    try {
      const response = await apiClient.get('/admin/users', { params })
      return response.data
    } catch (error) {
      console.error('获取用户列表失败:', error)
      throw error
    }
  },

  async getUserCoupons(userId) {
    try {
      const response = await apiClient.get(`/admin/users/${userId}/coupons`)
      return response.data
    } catch (error) {
      console.error('获取用户优惠券失败:', error)
      throw error
    }
  },

  // 活动管理
  async getCampaigns(params = {}) {
    try {
      const response = await apiClient.get('/admin/campaigns', { params })
      return response.data
    } catch (error) {
      console.error('获取活动列表失败:', error)
      throw error
    }
  },

  async createCampaign(campaignData) {
    try {
      const response = await apiClient.post('/admin/campaigns', campaignData)
      return response.data
    } catch (error) {
      console.error('创建活动失败:', error)
      throw error
    }
  },

  async updateCampaign(campaignId, campaignData) {
    try {
      const response = await apiClient.put(`/admin/campaigns/${campaignId}`, campaignData)
      return response.data
    } catch (error) {
      console.error('更新活动失败:', error)
      throw error
    }
  },

  async deleteCampaign(campaignId) {
    try {
      const response = await apiClient.delete(`/admin/campaigns/${campaignId}`)
      return response.data
    } catch (error) {
      console.error('删除活动失败:', error)
      throw error
    }
  },

  // 核销记录管理
  async getRedemptions(params = {}) {
    try {
      const response = await apiClient.get('/admin/redemptions', { params })
      return response.data
    } catch (error) {
      console.error('获取核销记录失败:', error)
      throw error
    }
  },

  async exportRedemptions(params = {}) {
    try {
      const response = await apiClient.get('/admin/redemptions/export', { params })
      return response.data
    } catch (error) {
      console.error('导出核销记录失败:', error)
      throw error
    }
  },

  // 员工绑定验证
  async verifyStaffBinding(data) {
    try {
      // 创建独立的axios实例，不包含认证头（因为这是公开API）
      const publicClient = axios.create({
        baseURL: '/api',
        timeout: 15000
      })
      
      const response = await publicClient.post('/admin/staff-binding/verify', data)
      return response.data
    } catch (error) {
      console.error('员工绑定验证失败:', error)
      throw error
    }
  }
}

export default adminApi