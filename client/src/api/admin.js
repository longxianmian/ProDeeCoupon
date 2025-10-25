import axios from 'axios'

// 获取管理员token
const getAdminToken = () => {
  return localStorage.getItem('admin_token')
}

// 配置axios默认设置
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
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
        
        // 显示提示消息
        import('element-plus').then(({ ElMessage }) => {
          ElMessage.warning({
            message: '登录已过期，请重新登录',
            duration: 2000,
            onClose: () => {
              window.location.replace('/admin/login')
            }
          })
        }).catch(() => {
          // 如果ElMessage加载失败，直接重定向
          window.location.replace('/admin/login')
        })
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

  // 活动多媒体文件上传
  async uploadCampaignMedia(formData) {
    try {
      const response = await apiClient.post('/admin/upload/campaign-media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      console.error('上传活动媒体文件失败:', error)
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
  },

  async listActivities(params = {}) {
    try {
      const response = await apiClient.get('/admin/campaigns', { params })
      return response.data
    } catch (error) {
      console.error('获取活动列表失败:', error)
      throw error
    }
  },

  /**
   * 批量将活动/CTA 绑定到多个内容
   * 首选后端批量接口 POST /api/posts/bind-activity
   * 若后端未提供，自动降级为逐条 PUT /api/posts/:id
   */
  async bindPostsActivity(payload = {}) {
    try {
      const res = await fetch('/api/posts/bind-activity', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) return res.json()
      // 非 2xx 走降级
    } catch (_) {}
    // —— 降级逐条 ——
    const { post_ids = [], ...fields } = payload
    const results = []
    for (const id of post_ids) {
      results.push(await this.updatePost(id, fields).catch(e => ({ id, error: e })))
    }
    return { data: results, degraded: true }
  },

  /** 批量取消绑定活动/CTA */
  async unbindPostsActivity(payload = {}) {
    const clean = { ...payload, activity_id: null, cta_type: null, cta_text: '', cta_link: '' }
    try {
      const res = await fetch('/api/posts/unbind-activity', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clean)
      })
      if (res.ok) return res.json()
    } catch (_) {}
    // —— 降级逐条 ——
    const { post_ids = [] } = clean
    const fields = { activity_id: null, cta_type: null, cta_text: '', cta_link: '' }
    const results = []
    for (const id of post_ids) {
      results.push(await this.updatePost(id, fields).catch(e => ({ id, error: e })))
    }
    return { data: results, degraded: true }
  },

  /** 更新单条内容（若项目里已存在同名方法，可直接复用原方法） */
  async updatePost(id, payload = {}) {
    const res = await fetch(`/api/posts/admin/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAdminToken()}` },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return res.json()
  },

  // 翻译服务
  async checkTranslationStatus() {
    try {
      const response = await apiClient.get('/translation/status')
      return response.data
    } catch (error) {
      console.error('检查翻译服务状态失败:', error)
      throw error
    }
  },

  async testTranslation(text, targetLang = 'en-us') {
    try {
      const response = await apiClient.post('/translation/test', {
        text,
        targetLang
      })
      return response.data
    } catch (error) {
      console.error('测试翻译失败:', error)
      throw error
    }
  },

  // 翻译活动内容（用于创建时的即时翻译）
  async translateContent(content) {
    try {
      const response = await apiClient.post('/translation/translate-content', content)
      return response.data
    } catch (error) {
      console.error('翻译内容失败:', error)
      throw error
    }
  },

  // 翻译指定优惠券
  async translateCoupon(couponId) {
    try {
      const response = await apiClient.post(`/translation/coupon/${couponId}`)
      return response.data
    } catch (error) {
      console.error('翻译优惠券失败:', error)
      throw error
    }
  },

  // 批量翻译所有优惠券
  async batchTranslateCoupons() {
    try {
      const response = await apiClient.post('/translation/batch/coupons')
      return response.data
    } catch (error) {
      console.error('批量翻译优惠券失败:', error)
      throw error
    }
  },

  // 账号管理
  async getAccounts() {
    try {
      const response = await apiClient.get('/admin/accounts')
      return response.data
    } catch (error) {
      console.error('获取账号列表失败:', error)
      throw error
    }
  },

  async createAccount(accountData) {
    try {
      const response = await apiClient.post('/admin/accounts', accountData)
      return response.data
    } catch (error) {
      console.error('创建账号失败:', error)
      throw error
    }
  },

  async updateAccount(accountId, accountData) {
    try {
      const response = await apiClient.put(`/admin/accounts/${accountId}`, accountData)
      return response.data
    } catch (error) {
      console.error('更新账号失败:', error)
      throw error
    }
  },

  async deleteAccount(accountId) {
    try {
      const response = await apiClient.delete(`/admin/accounts/${accountId}`)
      return response.data
    } catch (error) {
      console.error('删除账号失败:', error)
      throw error
    }
  },

  async resetAccountPassword(accountId, newPassword) {
    try {
      const response = await apiClient.post(`/admin/accounts/${accountId}/reset-password`, {
        newPassword
      })
      return response.data
    } catch (error) {
      console.error('重置密码失败:', error)
      throw error
    }
  },

  // 员工KPI
  async getStaffKpi(params = {}) {
    try {
      const response = await apiClient.get('/admin/staff-kpi', { params })
      return response.data
    } catch (error) {
      console.error('获取KPI数据失败:', error)
      throw error
    }
  },

  // 内容管理 
  async getPosts(params = {}) {
    try {
      const response = await apiClient.get('/admin/posts', { params })
      return response.data
    } catch (error) {
      console.error('获取内容列表失败:', error)
      throw error
    }
  },

  // 评论管理
  async getComments(params = {}) {
    try {
      const response = await apiClient.get('/admin/comments', { params })
      return response.data
    } catch (error) {
      console.error('获取评论列表失败:', error)
      throw error
    }
  },

  async approveComment(commentId) {
    try {
      const response = await apiClient.put(`/admin/comments/${commentId}/approve`)
      return response.data
    } catch (error) {
      console.error('审核通过失败:', error)
      throw error
    }
  },

  async rejectComment(commentId) {
    try {
      const response = await apiClient.put(`/admin/comments/${commentId}/reject`)
      return response.data
    } catch (error) {
      console.error('拒绝评论失败:', error)
      throw error
    }
  },

  async deleteComment(commentId) {
    try {
      const response = await apiClient.delete(`/admin/comments/${commentId}`)
      return response.data
    } catch (error) {
      console.error('删除评论失败:', error)
      throw error
    }
  }
}

export default adminApi