// 使用空字符串，直接拼接相对路径
const BASE = ''
async function http(path, opts){
  // 使用Cookie认证（主要认证方式）
  // 后端会自动从Cookie中读取session token
  const headers = { 'Content-Type': 'application/json' }
  
  const r = await fetch(BASE + path, { 
    credentials: 'include',  // 必须！发送Cookie
    headers, 
    ...(opts || {})
  })
  if (!r.ok) {
    const errorText = await r.text()
    console.error(`❌ API请求失败 [${path}]:`, r.status, errorText)
    
    // 创建带有状态码的错误，方便前端识别认证失败
    const error = new Error(errorText || `HTTP ${r.status}`)
    error.status = r.status
    error.isAuthError = r.status === 401 || r.status === 403
    throw error
  }
  return r.status === 204 ? null : r.json()
}

// 领取券（使用标准认证端点）
export async function claimCoupon(couponId){
  try {
    // 使用标准的带认证的领取端点
    return await http(`/api/coupons/${couponId}/claim`, { method:'POST' })
  } catch (error) {
    // 重要：不要吞掉401/403错误，让前端能正确处理认证失败
    console.error('❌ 领取优惠券失败:', error.message)
    throw error
  }
}