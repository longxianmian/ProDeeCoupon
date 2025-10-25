// 使用空字符串，直接拼接相对路径
const BASE = ''
async function http(u, opts){
  const r = await fetch(BASE+u, { credentials:'include', headers:{ 'Content-Type':'application/json' }, ...(opts||{}) })
  if(!r.ok) throw new Error(await r.text()); return r.json()
}
// 使用sequential fallback而不是Promise.any以提高兼容性
async function firstOk(candidates){ 
  for (const [u, opts] of candidates) {
    try {
      return await http(u, opts)
    } catch (error) {
      console.warn(`API fallback failed for ${u}:`, error)
      continue
    }
  }
  throw new Error('All API endpoints failed')
}

// 归属信息（可选）
export async function getStaffProfile(){
  try{ return await firstOk([[`/api/staff/profile`],[`/api/me/staff`]]) }catch{ return {} }
}

// 门店核销统计
export async function getStoreMetrics(storeId, range='today'){
  const q = `?range=${encodeURIComponent(range)}`
  try{ return await firstOk([[`/api/stores/${storeId}/metrics${q}`],[`/api/store/${storeId}/stats${q}`],[`/api/redemptions/metrics?storeId=${storeId}&${q.replace('?','')}`]]) }catch{ return { total:0, today:0, week:0 } }
}

// 门店参与活动
export async function getStoreActivities(storeId){
  try{ return await firstOk([[`/api/stores/${storeId}/activities`],[`/api/activities?storeId=${storeId}`],[`/api/campaigns?storeId=${storeId}`]]) }catch{ return [] }
}

// 店员个人核销记录
export async function getMyRedemptions({ storeId, page=1 }){
  const q = `?storeId=${storeId}&mine=1&page=${page}`
  try{ return await firstOk([[`/api/redemptions${q}`],[`/api/staff/redemptions${q}`]]) }catch{ return { items:[], nextPage:0 } }
}

// 扫码/手输核销（仅示例：按你后端接口改）
export async function verifyRedemption({ code, storeId, verifierId }){
  const body = JSON.stringify({ code, storeId, verifierId })
  try{ return await firstOk([[`/api/redemptions/verify`, { method:'POST', body }],[`/api/coupons/verify`, { method:'POST', body }]]) }catch(e){ throw new Error(e?.message||'核销失败') }
}