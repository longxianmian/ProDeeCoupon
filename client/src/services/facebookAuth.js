/**
 * Facebook IAB 登录服务
 * 提供与 liffLogin 类似的接口，用于 loginDialog
 */

// 检测是否在 Facebook IAB 环境
function isFacebookIAB() {
  const ua = (navigator.userAgent || '').toLowerCase()
  return ua.includes('fbav') || ua.includes('fban') || ua.includes('fb_iab')
}

// 检查功能是否启用
function isFBLoginEnabled() {
  return import.meta.env.VITE_FB_LOGIN_ENABLED !== 'false'
}

// 懒加载 Facebook SDK
async function ensureFBSDK() {
  if (window.FB) return

  const appId = import.meta.env.VITE_FB_APP_ID
  if (!appId) {
    throw new Error('VITE_FB_APP_ID not configured')
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.onload = () => {
      try {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: false,
          version: 'v20.0'
        })
        console.log('✅ Facebook SDK 加载成功')
        resolve()
      } catch (error) {
        console.error('❌ Facebook SDK 初始化失败:', error)
        reject(error)
      }
    }
    script.onerror = () => {
      console.error('❌ Facebook SDK 加载失败')
      reject(new Error('Failed to load Facebook SDK'))
    }
    document.head.appendChild(script)
  })
}

/**
 * Facebook 登录主函数（类似 liffLogin）
 * @returns {Promise<void>}
 */
export async function facebookLogin() {
  console.log('🔐 开始 Facebook 登录流程...')

  // 检查环境
  if (!isFacebookIAB()) {
    console.warn('⚠️ 不在 Facebook IAB 环境，建议使用其他登录方式')
    // 仍然允许继续，因为在开发/测试时可能需要
  }

  // 检查功能是否启用
  if (!isFBLoginEnabled()) {
    throw new Error('Facebook 登录功能未启用')
  }

  try {
    // 确保 SDK 已加载
    await ensureFBSDK()

    // 调用 Facebook 登录
    return new Promise((resolve, reject) => {
      window.FB.login(async (response) => {
        try {
          if (!response || !response.authResponse) {
            console.warn('⚠️ Facebook 登录取消或失败')
            reject(new Error('Login cancelled or failed'))
            return
          }

          console.log('✅ Facebook 登录成功，获取到 authResponse')
          console.log('🔄 发送认证信息到后端...')

          // 将 authResponse 发送到后端
          const res = await fetch('/auth/facebook/callback', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(response.authResponse)
          })

          const data = await res.json()

          if (data && data.ok) {
            console.log('✅ 后端会话建立成功')
            
            // 刷新页面以更新登录状态
            setTimeout(() => {
              window.location.reload()
            }, 500)
            
            resolve(data)
          } else {
            console.error('❌ 后端登录失败:', data)
            reject(new Error(data.message || 'Login failed'))
          }
        } catch (error) {
          console.error('❌ Facebook 登录回调处理失败:', error)
          reject(error)
        }
      }, { scope: 'public_profile' })
    })
  } catch (error) {
    console.error('❌ Facebook 登录失败:', error)
    throw error
  }
}

/**
 * 检查是否应该使用 Facebook 登录
 * @returns {boolean}
 */
export function shouldUseFacebookLogin() {
  return isFacebookIAB() && isFBLoginEnabled()
}
