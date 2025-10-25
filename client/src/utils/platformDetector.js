/**
 * 平台检测工具
 * 检测用户来自哪个平台：LINE、TikTok、Facebook、或普通浏览器
 */

/**
 * 检测是否在LINE应用内
 */
export function isInLINE() {
  const ua = navigator.userAgent || ''
  return ua.includes('Line/') || ua.includes('LINE/')
}

/**
 * 检测是否在TikTok应用内
 */
export function isInTikTok() {
  const ua = navigator.userAgent || ''
  // TikTok的User-Agent通常包含 BytedanceWebview、musical_ly、TikTok等
  return ua.includes('BytedanceWebview') || 
         ua.includes('musical_ly') || 
         ua.includes('TikTok') ||
         ua.includes('Aweme')
}

/**
 * 检测是否在Facebook应用内
 */
export function isInFacebook() {
  const ua = navigator.userAgent || ''
  // Facebook的User-Agent通常包含 FBAN、FBAV、FB_IAB等
  return ua.includes('FBAN') || 
         ua.includes('FBAV') || 
         ua.includes('FB_IAB') ||
         ua.includes('Instagram') // Instagram也算Facebook系
}

/**
 * 获取当前平台类型
 * @returns {'line' | 'tiktok' | 'facebook' | 'browser'}
 */
export function getPlatform() {
  if (isInLINE()) return 'line'
  if (isInTikTok()) return 'tiktok'
  if (isInFacebook()) return 'facebook'
  return 'browser'
}

/**
 * 获取平台显示名称
 * @param {string} locale - 语言代码 (zh-cn, en-us, th-th)
 * @returns {string}
 */
export function getPlatformName(locale = 'zh-cn') {
  const platform = getPlatform()
  
  const names = {
    line: {
      'zh-cn': 'LINE',
      'en-us': 'LINE',
      'th-th': 'LINE'
    },
    tiktok: {
      'zh-cn': 'TikTok',
      'en-us': 'TikTok',
      'th-th': 'TikTok'
    },
    facebook: {
      'zh-cn': 'Facebook',
      'en-us': 'Facebook',
      'th-th': 'Facebook'
    },
    browser: {
      'zh-cn': '浏览器',
      'en-us': 'Browser',
      'th-th': 'เบราว์เซอร์'
    }
  }
  
  return names[platform]?.[locale] || names[platform]?.['zh-cn'] || 'LINE'
}
