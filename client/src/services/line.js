import { setupLiff, buildLineDeepLink } from '@/utils/liff-loader'

const OA_ADD_FRIEND_URL = import.meta?.env?.VITE_LINE_OA_ADD_FRIEND_URL || 'https://line.me/R/ti/p/@YOUR_OA_ID'

// 增强的LINE环境检测（多重检测策略）
export function isInLINE() {
  const ua = navigator.userAgent
  const checks = []
  
  // 1. User-Agent检测（LINE应用内浏览器特征）
  if (/Line/i.test(ua)) {
    checks.push('✅ User-Agent包含Line')
    console.log('📱 LINE环境检测: User-Agent =', ua)
    return true
  }
  if (/LIFF/i.test(ua)) {
    checks.push('✅ User-Agent包含LIFF')
    console.log('📱 LINE环境检测: User-Agent =', ua)
    return true
  }
  
  // 2. LIFF对象检测（LINE应用会注入window.liff）
  if (window.liff) {
    checks.push('✅ 检测到window.liff对象')
    console.log('📱 LINE环境检测: window.liff已存在')
    return true
  }
  
  // 3. URL参数检测（LIFF应用会有特定参数）
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has('liff.state')) {
    checks.push('✅ URL包含liff.state参数')
    console.log('📱 LINE环境检测: URL包含liff.state')
    return true
  }
  
  // 4. Referrer检测（从LINE打开的链接）
  if (document.referrer && document.referrer.includes('line.me')) {
    checks.push('✅ Referrer来自line.me')
    console.log('📱 LINE环境检测: Referrer =', document.referrer)
    return true
  }
  
  // 所有检测都未通过
  console.log('🌐 非LINE环境检测结果:', {
    'User-Agent': ua,
    'window.liff': !!window.liff,
    'liff.state参数': urlParams.has('liff.state'),
    'Referrer': document.referrer
  })
  
  return false
}
export function openAddFriend(){ window.open(OA_ADD_FRIEND_URL, '_blank') }

export async function ensureLogin(){
  // 1. 检查后端会话Cookie（主要认证方式）
  const sessionValid = await checkBackendSession()
  if (sessionValid) {
    console.log('✅ 后端会话有效')
    return { ok:true, loggedIn:true, via:'cookie-session' }
  }

  const redirect = location.href
  const inLineApp = isInLINE()

  if (inLineApp) {
    // LINE应用内：使用LIFF ID Token交换（无重定向方案）
    try {
      console.log('📱 LINE环境：开始LIFF登录')
      const liff = await setupLiff()
      
      if (!liff.isLoggedIn()) {
        console.log('🔐 LIFF未登录，拉起授权...')
        liff.login({ redirectUri: location.href })
        return { ok:false, loggedIn:false, redirecting:true, via:'liff-login' }
      }
      
      console.log('✅ LIFF已登录，获取ID Token...')
      const idToken = liff.getIDToken()
      if (!idToken) {
        throw new Error('获取 LINE ID Token 失败')
      }
      
      console.log('🔄 调用后端交换会话...')
      // 关键：在同一请求中设置Cookie（不重定向）
      const res = await fetch('/api/auth/line/liff/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // 必须！接收Cookie
        body: JSON.stringify({ idToken })
      })
      
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `后端返回错误: ${res.status}`)
      }
      
      console.log('✅ 后端会话已建立:', data.userId)
      // 刷新页面，让Cookie生效
      location.reload()
      return { ok:false, loggedIn:false, redirecting:true, via:'liff-token-exchange' }
      
    } catch (e) {
      console.error('❌ LIFF登录失败:', e)
      // 降级到OAuth
      location.href = '/auth/line/login?redirect=' + encodeURIComponent(redirect)
      return { ok:false, loggedIn:false, redirecting:true, via:'web-login-fallback' }
    }
  } else {
    // 外部浏览器：使用OAuth登录
    console.log('🌐 外部浏览器，使用OAuth登录')
    location.href = '/auth/line/login?redirect=' + encodeURIComponent(redirect)
    return { ok:false, loggedIn:false, redirecting:true, via:'web-login' }
  }
}

// 检查后端会话是否有效
async function checkBackendSession() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      return data.success === true && data.data
    }
    return false
  } catch (e) {
    return false
  }
}

// 保留原函数，后续智能门会调用
export async function checkFriendship(){
  try { const r = await fetch('/api/line/friendship', { credentials:'include' })
    if(!r.ok) throw new Error(await r.text())
    const d = await r.json(); return { ok:true, following: !!d.following }
  } catch (e){ return { ok:false, following:false, error:String(e) } }
}