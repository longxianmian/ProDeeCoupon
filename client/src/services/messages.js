// 使用空字符串，直接拼接相对路径
const BASE = ''

function toArr(x){
  if (Array.isArray(x)) return x
  if (!x || typeof x !== 'object') return []
  for (const k of ['items','data','results','list','rows','records','notifications','messages']){
    if (Array.isArray(x[k])) return x[k]
  }
  return []
}

async function http(path, opts){
  const r = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...(opts||{})
  })
  if (!r.ok) throw new Error(await r.text())
  return r.status===204 ? null : r.json()
}

// 统一拉取：优先 /api/me/notifications
export async function fetchNotifications({ page=1, category='', unreadOnly=false }={}){
  const q = new URLSearchParams()
  if (page) q.set('page', String(page))
  if (category) q.set('category', category)
  if (unreadOnly) q.set('unread', '1')

  const candidates = [
    `/api/me/notifications?${q}`,
    `/api/notifications?mine=1&${q}`,
    `/api/messages?scope=me&${q}`
  ]
  for (const u of candidates){
    try { return await http(u) } catch(_) {}
  }
  return { items: [], nextPage: 0 }
}

export async function getUnreadCount(){
  const candidates = [ '/api/me/notifications/unread-count', '/api/notifications/unread-count?mine=1' ]
  for (const u of candidates){
    try { const d = await http(u); return (d?.count ?? d?.unread ?? 0) } catch(_) {}
  }
  // 退化：拉第一页统计
  try { const d = await fetchNotifications({ page:1, unreadOnly:true }); return toArr(d).length || toArr(d.items).length || 0 } catch { return 0 }
}

export async function markRead(id){
  const candidates = [ `/api/me/notifications/${id}/read`, `/api/notifications/${id}/read` ]
  for (const u of candidates){ try { await http(u, { method:'POST' }); return } catch(_){} }
}

export async function markAllRead(){
  const candidates = [ '/api/me/notifications/mark-all-read', '/api/notifications/mark-all-read?mine=1' ]
  for (const u of candidates){ try { await http(u, { method:'POST' }); return } catch(_){} }
}

export async function removeMessage(id){
  const candidates = [ `/api/me/notifications/${id}`, `/api/notifications/${id}` ]
  for (const u of candidates){ try { await http(u, { method:'DELETE' }); return } catch(_){} }
}

// 统一标准化
import { pickThumb } from '@/utils/thumb'
import { linkFor } from '@/utils/link'

export function normalizeList(payload){
  const arr = toArr(payload) || toArr(payload?.items)
  const list = arr.map(x => ({
    id: x.id,
    type: (x.type || x.category || 'system').toLowerCase(), // system|campaign|coupon|interaction
    title: x.title || x.subject || '通知',
    body: x.body || x.content || x.message || '',
    thumb: pickThumb(x) || pickThumb(x.target) || '',
    read: !!(x.read || x.isRead || x.readAt),
    time: x.createdAt || x.created_at || x.time || x.ts,
    deeplink: x.deeplink || x.link || linkFor(x.target || x)
  }))
  const nextPage = (payload?.nextPage ?? payload?.next ?? 0)
  return { list, nextPage }
}