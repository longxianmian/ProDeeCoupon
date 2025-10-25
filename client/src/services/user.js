// 使用空字符串，直接拼接相对路径
const BASE = ''

async function http(path, opts){
  // 使用存储的JWT Token进行认证
  let authHeaders = { 'Content-Type': 'application/json' }
  
  try {
    const { getStoredToken } = await import('./auth')
    const jwtToken = getStoredToken()
    if (jwtToken) {
      authHeaders['Authorization'] = `Bearer ${jwtToken}`
      console.log('🔐 [user.js] 使用JWT Token认证:', path)
    } else {
      // 静默处理：不再警告缺少token（游客模式是正常的）
      // 之前版本会在每次API调用时输出警告，造成控制台噪音
      // 现在改为仅在debug模式下记录
      if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
        console.log('ℹ️ [user.js] 无token，游客模式:', path)
      }
    }
  } catch (error) {
    console.warn('❌ [user.js] 无法获取JWT Token:', error.message)
  }
  
  // 合并调用者提供的headers和认证headers
  const mergedHeaders = {
    ...authHeaders,
    ...(opts?.headers || {})
  }
  
  const r = await fetch(BASE + path, { 
    credentials: 'include', 
    ...opts,
    headers: mergedHeaders
  })
  if (!r.ok) {
    const errorText = await r.text()
    console.error(`❌ [user.js] API请求失败 [${path}]:`, r.status, errorText)
    throw new Error(errorText)
  }
  return r.status===204 ? null : r.json()
}

export async function getMe(){
  // === 开发环境容错：非LINE环境直接返回游客用户 ===
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'
  const inLINE = /Line/i.test(navigator.userAgent) || window.liff
  
  if (isDev && !inLINE) {
    // 开发环境、非LINE浏览器：检查是否有token
    const { getStoredToken } = await import('./auth')
    const hasToken = !!getStoredToken()
    
    if (!hasToken) {
      console.log('🔓 [DEV] 非LINE环境且无token，使用游客模式')
      return null // 返回null让authStore使用默认游客状态
    }
  }
  // === 开发环境容错结束 ===
  
  try{
    const d = await http('/api/me')
    const me = (d && typeof d==='object' && d.data) ? d.data : d
    // 统一 roles / isStaff / storeId 字段，便于前端判断
    if (me){
      const roles = (me.roles || me.role || []).map?.(x=>String(x).toLowerCase()) || []
      me.isStaff = !!(me.isStaff || me.staff || roles.includes('staff') || roles.includes('clerk'))
      me.storeId = me.storeId || me.store_id || me.store?.id || null
    }
    return me
  }catch{ return null }
}

export async function updateMe(patch){
  return http('/api/me', { method:'PUT', body: JSON.stringify(patch) })
}

// 用 LINE 登录：把 idToken + profile 送给后端换会话 & 落库头像/昵称
export async function loginWithLine({ idToken, profile }){
  return http('/api/auth/line', { method:'POST', body: JSON.stringify({ idToken, profile }) })
}

// 获取用户优惠券列表
export async function getUserCoupons({ status = 'all', page = 1, limit = 100 } = {}) {
  const params = new URLSearchParams({ status, page: page.toString(), limit: limit.toString() })
  return http(`/api/auth/me/coupons?${params}`)
}

// 更新用户信息
export async function updateUser(data) {
  return http('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) })
}

// 用户退出登录
export async function logoutUser() {
  console.log('🚪 开始退出登录流程...')
  
  // 先清除本地存储（无论API是否成功）
  console.log('🗑️ 清除localStorage...')
  localStorage.removeItem('user_token')
  localStorage.removeItem('admin_token')
  localStorage.removeItem('user_info')
  console.log('✅ localStorage已清除')
  
  // 清除LIFF登录状态
  try {
    if (window.liff?.logout) {
      console.log('🔓 执行LIFF logout...')
      window.liff.logout()
      console.log('✅ LIFF logout完成')
    }
  } catch (err) {
    console.warn('⚠️ LIFF logout失败:', err)
  }
  
  // 最后调用服务器API（即使失败也不影响前面的清除）
  try {
    console.log('📡 调用服务器logout API...')
    await http('/api/auth/logout', { method: 'POST' })
    console.log('✅ 服务器logout成功')
  } catch (err) {
    console.warn('⚠️ 服务器logout失败（已忽略）:', err.message)
  }
  
  console.log('✅ 退出登录流程完成')
}

// 测试登录（仅开发/测试环境）
export async function testLogin() {
  return http('/api/auth/test-login', { method: 'POST' })
}

// 获取用户信息并更新全局状态（给main.js的OAuth登录流程使用）
export async function fetchMe() {
  try {
    // 动态导入authStore避免循环依赖
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    console.log('🔄 [fetchMe] 开始刷新用户状态...')
    await authStore.refresh(true) // 强制刷新
    console.log('✅ [fetchMe] 用户状态已更新:', authStore.me)
  } catch (err) {
    console.error('❌ [fetchMe] 更新用户状态失败:', err)
  }
}