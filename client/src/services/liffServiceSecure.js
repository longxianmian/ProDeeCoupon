import liff from '@line/liff'

class LiffServiceSecure {
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
   * 获取LIFF ID Token（用于服务器端验证）
   */
  getIdToken() {
    if (!this.isLoggedIn()) return null
    try {
      const idToken = liff.getIDToken()
      console.log('🔑 获取LIFF ID Token成功')
      return idToken
    } catch (error) {
      console.error('❌ 获取LIFF ID Token失败:', error)
      return null
    }
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
   * 登录（支持请求特定权限scope）
   */
  async login(options = {}) {
    try {
      if (!this.isInitialized) {
        await this.init()
      }

      if (this.isLoggedIn()) {
        console.log('👤 用户已登录')
        return await this.getProfile()
      }

      console.log('🚀 开始LINE登录...', options)
      
      const loginOptions = {
        redirectUri: window.location.href,
        ...options
      }
      
      if (this.isInClient()) {
        // 在LINE内部浏览器中直接登录
        await liff.login(loginOptions)
      } else {
        // 在外部浏览器中重定向到LINE登录页面
        await liff.login(loginOptions)
      }
      
      // 登录成功后获取用户档案
      return await this.getProfile()
    } catch (error) {
      console.error('❌ LINE登录失败:', error)
      throw error
    }
  }

  /**
   * 带手机号权限的登录（用于员工绑定等需要手机号验证的场景）
   * 注意：phone权限必须在LINE开发者控制台中预先配置，无法通过代码动态请求
   */
  async loginWithPhoneScope() {
    try {
      console.log('📱 启动LINE登录（需要预配置phone权限）...')
      
      // LIFF不支持动态scope，必须在控制台配置
      const result = await this.login()
      
      // 检查ID Token是否包含phone_number
      const idToken = this.getIdToken()
      if (idToken) {
        try {
          // 简单检查token payload（仅用于警告）
          const payload = JSON.parse(atob(idToken.split('.')[1]))
          if (!payload.phone_number) {
            console.warn('⚠️ ID Token中未包含手机号。请在LINE开发者控制台中为此LIFF应用启用phone权限范围。')
            console.warn('配置路径：LINE Login Channel → OpenID Connect → Scope → 启用phone')
          }
        } catch (parseError) {
          console.warn('⚠️ 无法解析ID Token以检查phone权限')
        }
      }
      
      return result
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
   * 关注官方账号 - 使用一键关注功能
   */
  async followOfficialAccount() {
    try {
      if (!this.isInClient()) {
        return {
          success: false,
          message: '关注功能只能在LINE应用内使用',
          needFollow: true
        }
      }

      // 检查是否已关注
      const friendship = await liff.getFriendship()
      if (friendship.friendFlag) {
        console.log('✅ 用户已关注官方账号')
        return { 
          success: true, 
          message: '您已关注我们的官方账号',
          isFollowing: true 
        }
      }

      console.log('📢 开始一键关注流程...')
      
      // 使用liff.openWindow打开官方账号页面进行关注
      const officialAccountUrl = `https://line.me/R/ti/p/%40${import.meta.env.VITE_LINE_BOT_ID || ''}`
      
      try {
        // 在LINE内部使用openWindow打开官方账号页面
        await liff.openWindow({
          url: officialAccountUrl,
          external: false // 在LINE内部打开
        })
        
        console.log('🔗 已打开官方账号页面，等待用户关注...')
        
        return {
          success: false,
          message: '请在打开的页面中点击关注，然后返回继续操作',
          needFollow: true,
          actionTaken: 'opened_follow_page'
        }
      } catch (openError) {
        console.warn('⚠️ openWindow失败，尝试外部浏览器:', openError)
        
        // 如果openWindow失败，尝试外部浏览器
        await liff.openWindow({
          url: officialAccountUrl,
          external: true
        })
        
        return {
          success: false,
          message: '请在打开的浏览器页面中关注我们，然后返回APP继续操作',
          needFollow: true,
          actionTaken: 'opened_external_browser'
        }
      }
    } catch (error) {
      console.error('❌ 一键关注功能失败:', error)
      
      // 降级到手动关注提示
      return { 
        success: false, 
        message: '请手动搜索并关注我们的LINE官方账号，然后重试',
        needFollow: true,
        error: error.message
      }
    }
  }

  /**
   * 重新检查关注状态（用于关注后验证）
   */
  async recheckFollowStatus() {
    try {
      if (!this.isInClient()) {
        return { success: false, message: '只能在LINE应用内检查关注状态' }
      }

      const friendship = await liff.getFriendship()
      
      console.log('🔄 重新检查关注状态:', friendship.friendFlag)
      
      return {
        success: friendship.friendFlag,
        isFollowing: friendship.friendFlag,
        message: friendship.friendFlag ? '已关注官方账号' : '尚未关注官方账号'
      }
    } catch (error) {
      console.error('❌ 重新检查关注状态失败:', error)
      return {
        success: false,
        message: '检查关注状态失败，请重试',
        error: error.message
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

  /**
   * 安全的验证用户并获取服务器端验证的结果
   */
  async verifyUserSecurely() {
    try {
      if (!this.isLoggedIn()) {
        throw new Error('用户未登录')
      }

      // 获取ID Token用于服务器端验证
      const idToken = this.getIdToken()
      if (!idToken) {
        throw new Error('无法获取ID Token')
      }

      console.log('🔐 开始安全验证流程...')
      
      return {
        success: true,
        idToken,
        profile: await this.getProfile()
      }
    } catch (error) {
      console.error('❌ 安全验证失败:', error)
      throw error
    }
  }
}

// 创建全局实例
const liffServiceSecure = new LiffServiceSecure()

export default liffServiceSecure