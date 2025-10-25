// 使用空字符串，直接拼接相对路径
const BASE = ''

async function http(path, opts = {}) {
  const headers = opts.headers || {}
  if (!headers['Content-Type'] && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const token = localStorage.getItem('admin_token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...opts, headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function createPost(payload) {
  // 后端需返回 { id }；payload.type = 'article' | 'video'
  return http('/api/posts/admin', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getPost(id) {
  return http(`/api/posts/${id}`)
}

export async function createComment(postId, payload) {
  return http(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function getVideoFeed(page = 1, limit = 20, lang = 'zh-cn') {
  // 期望：[{id,url,cover,title,likes,comments}]
  return http(`/api/posts/video-feed?page=${page}&limit=${limit}&lang=${lang}`)
}