import { showDialog } from 'vant'
import { liffLogin } from '@/services/auth'
import { facebookLogin } from '@/services/facebookAuth'
import { getPlatform, getPlatformName } from './platformDetector'

/**
 * TikTok登录处理
 */
function handleTikTokLogin() {
  // TODO: 实现TikTok登录逻辑
  console.log('🎵 TikTok登录暂未实现')
  alert('TikTok登录功能即将上线，敬请期待！')
}

/**
 * Facebook登录处理
 */
async function handleFacebookLogin() {
  console.log('👍 开始 Facebook 登录...')
  try {
    await facebookLogin()
    // facebookLogin 成功后会自动刷新页面
  } catch (error) {
    console.error('❌ Facebook 登录失败:', error)
    // 不显示 alert，因为 facebookLogin 内部已经处理了错误
  }
}

/**
 * 显示智能登录对话框（根据平台自动选择）
 * @param {Object} i18n - Vue i18n实例 (包含t函数和locale)
 * @returns {Promise} 对话框Promise
 */
export function showLoginDialog(i18n) {
  const t = i18n?.t || ((key) => key)
  const locale = i18n?.locale?.value || 'zh-cn'
  const platform = getPlatform()
  const platformName = getPlatformName(locale)
  
  // 根据平台设置不同的按钮颜色
  const buttonColors = {
    line: '#00B900',      // LINE绿色
    tiktok: '#FE2C55',    // TikTok粉红色
    facebook: '#1877F2',  // Facebook蓝色
    browser: '#00B900'    // 默认用LINE绿色
  }
  
  // 根据平台生成不同的文案（优化：浏览器环境默认显示LINE）
  const getLoginMessage = () => {
    const displayName = platform === 'browser' ? 'LINE' : platformName
    const baseMessages = {
      'zh-cn': `请用${displayName}一键登录，卡券自动存入您"我的"个人中心！`,
      'en-us': `Please login with ${displayName} to save coupons to your personal center!`,
      'th-th': `กรุณาเข้าสู่ระบบด้วย ${displayName} เพื่อบันทึกคูปองในศูนย์ส่วนตัวของคุณ!`
    }
    return baseMessages[locale] || baseMessages['zh-cn']
  }
  
  const getLoginButtonText = () => {
    // 优化：浏览器环境默认显示LINE
    const displayName = platform === 'browser' ? 'LINE' : platformName
    const buttonTexts = {
      'zh-cn': `用 ${displayName} 一键登录`,
      'en-us': `Login with ${displayName}`,
      'th-th': `เข้าสู่ระบบด้วย ${displayName}`
    }
    return buttonTexts[locale] || buttonTexts['zh-cn']
  }
  
  return showDialog({
    title: t('coupon.loginRequired') || '需要登录',
    message: getLoginMessage(),
    confirmButtonText: getLoginButtonText(),
    confirmButtonColor: buttonColors[platform],
    showCancelButton: true,
    cancelButtonText: t('common.cancel') || '取消'
  }).then(() => {
    // 根据平台触发不同的登录流程
    console.log(`🔐 触发${platformName}登录，平台代码:`, platform)
    
    switch (platform) {
      case 'line':
        liffLogin()
        break
      case 'tiktok':
        handleTikTokLogin()
        break
      case 'facebook':
        handleFacebookLogin()
        break
      default:
        // 默认使用LINE登录
        liffLogin()
    }
  }).catch(() => {
    // 点击取消按钮，什么也不做
  })
}
