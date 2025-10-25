/**
 * 媒体URL解析工具
 * 处理相对路径、绝对路径和对象存储键的URL规范化
 */

// 使用空字符串，直接拼接相对路径
const API_BASE = ''
// 始终使用当前域名，忽略VITE_PUBLIC_HOST环境变量
const PUBLIC_HOST = (typeof window !== 'undefined' ? window.location.origin : '')

/**
 * 解析媒体URL为完整的可访问URL
 * @param {string|object} source - 媒体源（可能是URL字符串或包含url/path/key的对象）
 * @returns {string|null} - 完整的URL或null
 */
export function resolveMediaUrl(source) {
  if (!source) return null
  
  let url = typeof source === 'string' ? source : (source.url || source.path || source.key)
  if (!url) return null
  
  // 已经是完整URL（http/https/data）
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url
  }
  
  // uploads 路径：在前后端分离部署时需要通过API代理访问
  if (url.startsWith('/uploads/')) {
    // 如果有API_BASE（如 '/api'），添加前缀以通过代理访问后端
    return API_BASE ? `${API_BASE}${url}` : url
  }
  // 对象存储路径 /objects/* 不应添加 API_BASE 前缀
  if (url.startsWith('/objects/')) {
    return url
  }
  // 其他以 / 开头的路径使用 API_BASE 前缀
  if (url.startsWith('/')) {
    return `${API_BASE}${url}`
  }
  
  // 对象存储键，构建API端点
  if (typeof source === 'object' && source.key) {
    return `${API_BASE}/api/storage/image?key=${encodeURIComponent(source.key)}`
  }
  
  // 其他情况，尝试作为相对路径处理
  return `${PUBLIC_HOST}/${url}`
}

/**
 * 解析媒体文件列表
 * @param {Array} mediaFiles - 媒体文件数组
 * @returns {Array} - 解析后的URL数组
 */
export function resolveMediaUrls(mediaFiles) {
  if (!Array.isArray(mediaFiles)) return []
  
  return mediaFiles
    .map(resolveMediaUrl)
    .filter(url => url !== null)
}

/**
 * 获取安全的图片URL，带错误处理
 * @param {string|object} source - 媒体源
 * @param {string} fallback - 备用图片URL
 * @returns {string} - 安全的图片URL
 */
export function getSafeImageUrl(source, fallback = '/placeholder-coupon.png') {
  try {
    const resolved = resolveMediaUrl(source)
    return resolved || fallback
  } catch (error) {
    console.warn('解析图片URL失败:', error)
    return fallback
  }
}