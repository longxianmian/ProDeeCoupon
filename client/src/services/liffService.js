import liff from '@line/liff'

class LiffService {
  constructor() {
    this.isInitialized = false
    this.liffId = import.meta.env.VITE_LINE_LIFF_ID
  }

  /**
   * 初始化LIFF
   */
  async init() {
    try {
      if (this.isInitialized) return

      if (!this.liffId) {
        throw new Error('LIFF ID未配置')
      }

      console.log('🔧 初始化LIFF...', this.liffId)
      await liff.init({ liffId: this.liffId })
      this.isInitialized = true
      console.log('✅ LIFF初始化成功')
      
      return true
    } catch (error) {
      console.error('❌ LIFF初始化失败:', error)
      throw error
    }
  }

  /**
   * 检查是否在LINE内部浏览器
   */
  isInClient() {
    return liff.isInClient()
  }

  /**
   * 检查用户是否已登录
   */
  isLoggedIn() {
    return liff.isLoggedIn()
  }

  /**
   * 获取用户访问令牌
   */
  getAccessToken() {
    if (!this.isLoggedIn()) return null
    return liff.getAccessToken()
  }

  /**
   * 获取 ID Token（用于后端验证）
   */
  getIDToken() {
    if (!this.isLoggedIn()) return null
    return liff.getIDToken()
  }

  /**
   * 获取用户档案信息
   */
  async getProfile() {
    try {
      if (!this.isLoggedIn()) {
        throw new Error('用户未登录')
      }

      const profile = await liff.getProfile()
      console.log('📱 获取用户档案:', profile)
      return profile
    } catch (error) {
      console.error('❌ 获取用户档案失败:', error)
      throw error
    }
  }

  /**
   * 登录并建立后端会话（LINE 环境专用 - 无重定向方案）
   */
  async login() {
    try {
      if (!this.isInitialized) {
        await this.init()
      }

      // 1. 如果未在 LIFF 侧登录，先拉起 LINE 授权
      if (!this.isLoggedIn()) {
        console.log('🚀 开始 LINE 登录...')
        await liff.login({ redirectUri: window.location.href })
        return // 等待重定向回来
      }

      console.log('✅ LIFF 已登录，准备建立后端会话...')

      // 2. 获取 ID Token
      const idToken = this.getIDToken()
      if (!idToken) {
        throw new Error('获取 LINE ID Token 失败')
      }

      console.log('🔐 已获取 ID Token，正在与后端交换会话...')

      // 3. 调用后端接口，在当前请求中设置会话 Cookie（不重定向）
      const res = await fetch('/api/auth/line/liff/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 必须！让浏览器接收 Cookie
        body: JSON.stringify({ idToken })
      })

      const data = await res.json()

      if (!res.ok || !data?.success) {
        console.error('❌ 后端会话建立失败:', data)
        throw new Error(data?.message || '登录失败')
      }

      console.log('✅ 后端会话已建立:', data.userId)

      // 4. 会话已建立，刷新页面或继续业务
      // 注意：刷新后前端就能通过 Cookie 访问 /api/me 了
      return {
        success: true,
        userId: data.userId,
        userName: data.userName
      }
    } catch (error) {
      console.error('❌ LINE 登录失败:', error)
      throw error
    }
  }

  /**
   * 旧的登录方法（备用）
   */
  async loginLegacy() {
    try {
      if (!this.isInitialized) {
        await this.init()
      }

      if (this.isLoggedIn()) {
        console.log('👤 用户已登录')
        return await this.getProfile()
      }

      console.log('🚀 开始LINE登录...')
      
      if (this.isInClient()) {
        // 在LINE内部浏览器中直接登录
        await liff.login()
      } else {
        // 在外部浏览器中重定向到LINE登录页面
        await liff.login({
          redirectUri: window.location.href
        })
      }
      
      // 登录成功后获取用户档案
      return await this.getProfile()
    } catch (error) {
      console.error('❌ LINE登录失败:', error)
      throw error
    }
  }

  /**
   * 登出
   */
  logout() {
    if (this.isLoggedIn()) {
      liff.logout()
      console.log('👋 用户已登出')
    }
  }

  /**
   * 关注官方账号
   */
  async followOfficialAccount() {
    try {
      if (!this.isInClient()) {
        throw new Error('关注功能只能在LINE应用内使用')
      }

      // 检查是否已关注
      const friendship = await liff.getFriendship()
      if (friendship.friendFlag) {
        console.log('✅ 用户已关注官方账号')
        return { success: true, message: '您已关注我们的官方账号' }
      }

      // 如果未关注，引导用户关注
      console.log('📢 引导用户关注官方账号...')
      
      // 使用LIFF的关注API（如果可用）
      if (liff.permanentLink && liff.permanentLink.setExtraQueryParam) {
        // 设置关注提示参数
        liff.permanentLink.setExtraQueryParam('follow', 'required')
      }

      return { 
        success: false, 
        message: '请关注我们的官方账号以领取优惠券',
        needFollow: true 
      }
    } catch (error) {
      console.error('❌ 检查关注状态失败:', error)
      // 如果API不支持，返回需要手动关注的提示
      return { 
        success: false, 
        message: '请手动关注我们的LINE官方账号后重试',
        needFollow: true 
      }
    }
  }

  /**
   * 分享消息到LINE
   */
  async shareMessage(message) {
    try {
      if (!this.isInClient()) {
        throw new Error('分享功能只能在LINE应用内使用')
      }

      await liff.shareTargetPicker([{
        type: 'text',
        text: message
      }])
      
      console.log('📤 消息分享成功')
      return true
    } catch (error) {
      console.error('❌ 分享失败:', error)
      throw error
    }
  }

  /**
   * 关闭LIFF窗口
   */
  closeWindow() {
    if (this.isInClient()) {
      liff.closeWindow()
    } else {
      // 在外部浏览器中，可能需要其他处理
      console.log('🪟 LIFF窗口关闭请求（外部浏览器）')
    }
  }

  /**
   * 发送统计数据到LINE
   */
  async sendUsageEvent(action, data = {}) {
    try {
      // 使用LIFF的统计功能（如果需要）
      console.log('📊 发送使用统计:', { action, data })
      // 这里可以发送自定义事件到后端进行统计
    } catch (error) {
      console.error('❌ 发送统计失败:', error)
    }
  }
}

// 创建全局实例
const liffService = new LiffService()

export default liffService