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
   * 登录
   */
  async login() {
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