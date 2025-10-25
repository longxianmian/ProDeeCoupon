// 环境/UA 检测 + LIFF 深链构造
export function isLineWebView(){
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  // 只检查 UserAgent，不检查 liff 对象（因为我们在所有环境都初始化了 LIFF SDK）
  return /Line\//i.test(ua)
}

export function getLang(){
  return (localStorage.getItem('user-language') || 'th-TH')
}

export function getProvince(){
  return localStorage.getItem('province') || 'bangkok'
}

export function buildLiffDeepLink({ route='/', query={}, utm={} }={}){
  const liffId = import.meta?.env?.VITE_LINE_LIFF_ID || import.meta?.env?.VITE_LIFF_ID
  if (!liffId) throw new Error('Missing VITE_LINE_LIFF_ID or VITE_LIFF_ID')
  const p = new URLSearchParams()
  p.set('r', route + (Object.keys(query||{}).length ? ('?' + new URLSearchParams(query).toString()) : ''))
  // 透传 UTM 与上下文
  const ctx = { ...utm }
  const lang = getLang(); if (lang) p.set('lang', lang)
  const province = getProvince(); if (province) p.set('province', province)
  for (const k of Object.keys(ctx)) if (ctx[k] != null) p.set(k, ctx[k])
  return `https://liff.line.me/${liffId}?${p.toString()}`
}

export function currentRouteWithQuery(){
  const u = new URL(window.location.href)
  return { path: window.location.pathname, query: Object.fromEntries(u.searchParams.entries()) }
}