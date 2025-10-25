// 轻量封装 LINE LIFF：初始化 / 登录 / 取 Profile / 取 ID Token（供后端换会话）
const getLiffId = () => {
  const liffId = import.meta.env.VITE_LINE_LIFF_ID || import.meta.env.VITE_LIFF_ID
  console.log('🔍 获取LIFF ID (auth.js):', liffId ? `${liffId.substring(0, 10)}...` : '未配置', 
              'VITE_LINE_LIFF_ID存在:', !!import.meta.env.VITE_LINE_LIFF_ID)
  return liffId
}

// 动态加载LIFF SDK
async function loadLiffSDK() {
  if (window.liff) return // 已加载
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('LIFF SDK load failed'))
    document.head.appendChild(script)
  })
}

export async function ensureLiff(){
  // 首先确保SDK已加载
  await loadLiffSDK()
  
  if (!window.liff) throw new Error('LIFF SDK not loaded')
  
  // 在LINE内嵌环境中，LIFF可能已经自动初始化
  if (window.liff.isInClient && window.liff.isInClient()) {
    return // 在 LINE 内嵌无需手动 init
  }
  
  // 检查是否需要初始化（兼容不同LIFF SDK版本）
  const needsInit = !window.liff._isInitialized && !window.liff.isReady
  
  if (needsInit) {
    const liffId = getLiffId()
    if (!liffId) throw new Error('missing LIFF ID')
    console.log('🚀 正在初始化LIFF SDK...', liffId.substring(0, 10) + '...')
    await window.liff.init({ liffId })
    console.log('✅ LIFF SDK初始化完成')
  }
}

// 检测是否在LINE应用内
function isInLINE() {
  const ua = navigator.userAgent || ''
  return ua.includes('Line/') || ua.includes('LINE/')
}

// 检测是否在Facebook应用内
function isInFacebook() {
  const ua = navigator.userAgent || ''
  return ua.includes('FBAN') || ua.includes('FBAV') || ua.includes('FB_IAB') || ua.includes('Instagram')
}

export async function liffLogin(){
  // 多平台智能登录：
  // 1. LINE环境 -> 使用LIFF登录
  // 2. Facebook环境 -> 跳转到Facebook登录（由loginDialog处理）
  // 3. 普通浏览器 -> 使用PKCE OAuth登录
  
  const inLINE = isInLINE()
  const inFacebook = isInFacebook()
  
  console.log('🔍 平台检测:', { inLINE, inFacebook, ua: navigator.userAgent })
  
  // 如果在Facebook环境，不应该调用liffLogin
  if (inFacebook) {
    console.warn('⚠️ 在Facebook环境中调用了liffLogin，应该使用facebookLogin')
    throw new Error('请使用Facebook登录')
  }
  
  // 如果在LINE环境，使用LIFF登录
  if (inLINE) {
    console.log('📱 LINE环境：使用LIFF登录')
    await ensureLiff()
    
    if (!window.liff) throw new Error('LIFF SDK not loaded')
    
    const existingToken = localStorage.getItem('user_token')
    
    if (!window.liff.isLoggedIn()) {
      console.log('🔐 启动LIFF登录流程...')
      const redirectUri = window.location.href
      window.liff.login({ redirectUri })
      await new Promise(()=>{}) // 跳转后不再执行
    } else if (!existingToken) {
      console.log('🔑 LIFF已登录，交换token...')
      const { exchangeTokenAndStore } = await import('./auth')
      const jwtToken = await exchangeTokenAndStore()
      if (jwtToken) {
        console.log('✅ Token交换完成')
        return jwtToken
      } else {
        throw new Error('Token交换失败')
      }
    } else {
      console.log('✅ 已登录状态')
    }
  } else {
    // 普通浏览器：使用PKCE OAuth登录
    console.log('🌐 浏览器环境：使用PKCE OAuth登录')
    const currentPath = window.location.pathname + window.location.search + window.location.hash
    window.location.href = `/auth/line/start?return=${encodeURIComponent(currentPath)}`
    await new Promise(()=>{}) // 跳转后不再执行
  }
}

export async function getLiffProfile(){
  await ensureLiff()
  if (!window.liff) throw new Error('LIFF SDK not loaded')
  if (!window.liff.isLoggedIn()) throw new Error('User not logged in')
  return window.liff.getProfile() // { userId, displayName, pictureUrl }
}

export async function getIdToken(){
  await ensureLiff()
  if (!window.liff) throw new Error('LIFF SDK not loaded')
  if (!window.liff.isLoggedIn()) throw new Error('User not logged in')
  
  const idToken = window.liff.getIDToken?.()
  console.log('🔍 获取ID Token:', idToken ? `长度=${idToken.length}` : '为空')
  
  // 验证Token有效性（LIFF ID Token应该很长，至少100+字符）
  if (idToken && idToken.length > 50) {
    console.log('✅ ID Token有效，长度:', idToken.length)
    return idToken
  }
  
  console.warn('⚠️ LIFF ID Token无效或太短，尝试使用Access Token')
  const accessToken = window.liff.getAccessToken?.()
  console.log('🔍 获取Access Token:', accessToken ? `长度=${accessToken.length}` : '为空')
  if (accessToken && accessToken.length > 50) {
    console.log('✅ Access Token有效，使用它作为替代')
    return accessToken
  }
  
  console.error('❌ 无法获取任何有效的LIFF Token')
  throw new Error('无法获取有效的LIFF Token')
}

// 检查JWT Token是否有效（简单检查：是否存在且未过期）
function isTokenValid(token) {
  if (!token) return false
  
  try {
    // JWT格式: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    // 解码payload检查过期时间
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp) {
      const expiryTime = payload.exp * 1000 // 转换为毫秒
      const now = Date.now()
      // 如果token在5分钟内过期，认为无效（提前刷新）
      return expiryTime > now + 5 * 60 * 1000
    }
    
    return true // 没有过期时间，认为有效
  } catch (error) {
    console.warn('⚠️ Token验证失败:', error.message)
    return false
  }
}

// 交换LIFF ID Token为服务器签发的JWT Token
export async function exchangeTokenAndStore() {
  try {
    console.log('🚀 exchangeTokenAndStore 开始执行...')
    
    // 检查是否已有有效的JWT
    const existingToken = localStorage.getItem('user_token')
    if (existingToken && isTokenValid(existingToken)) {
      console.log('✅ 已存在有效的JWT Token，跳过交换')
      return existingToken
    }

    console.log('📥 尝试获取LIFF ID Token...')
    let idToken
    try {
      idToken = await getIdToken()
      console.log('✅ 成功获取LIFF ID Token，长度:', idToken.length)
    } catch (error) {
      console.error('❌ 获取LIFF ID Token失败:', error)
      console.error('错误堆栈:', error.stack)
      return null
    }
    
    if (!idToken || idToken.length < 50) {
      console.error('❌ LIFF ID Token无效或太短，跳过交换，长度:', idToken?.length || 0)
      return null
    }

    console.log('🔄 开始交换LIFF ID Token为JWT...', `Token长度: ${idToken.length}`)
    const BASE = ''
    const response = await fetch(`${BASE}/api/auth/liff/exchange-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token交换失败: ${errorText}`)
    }

    const result = await response.json()
    if (result.success && result.data?.token) {
      const jwtToken = result.data.token
      localStorage.setItem('user_token', jwtToken)
      console.log('✅ JWT Token已保存到localStorage')
      
      // 同时保存用户信息
      if (result.data.user) {
        localStorage.setItem('user_info', JSON.stringify(result.data.user))
      }
      
      return jwtToken
    } else {
      throw new Error('Token交换返回格式错误')
    }
  } catch (error) {
    console.error('❌ Token交换失败:', error)
    return null
  }
}

// 获取存储的JWT Token（优先使用服务器签发的JWT）
export function getStoredToken() {
  return localStorage.getItem('user_token')
}