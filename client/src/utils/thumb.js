import { resolveMediaUrl } from './mediaUrl.js'

// 视频占位符缩略图（带播放图标）
const VIDEO_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 162">
    <rect width="100" height="162" fill="#1a1a1a"/>
    <circle cx="50" cy="81" r="20" fill="rgba(255,255,255,0.9)"/>
    <polygon points="45,71 45,91 60,81" fill="#1a1a1a"/>
  </svg>
`)

// 统一缩略图选择器 - 支持多种字段名，返回完整URL
export function pickThumb(x = {}) {
  if (!x) return null
  
  // 如果有 media_files，优先处理
  if (Array.isArray(x.media_files) && x.media_files.length > 0) {
    // 查找封面图（type='cover'）
    const coverFile = x.media_files.find(f => f.type === 'cover')
    if (coverFile) {
      const coverUrl = resolveMediaUrl(coverFile)
      if (coverUrl) return coverUrl
    }
    
    // 查找第一张图片（type='image'）
    const imageFile = x.media_files.find(f => f.type === 'image')
    if (imageFile) {
      const imageUrl = resolveMediaUrl(imageFile)
      if (imageUrl) return imageUrl
    }
    
    // 注意：不再为纯视频返回占位符，而是返回 null
    // 这样 feed.js 可以调用 getVideoThumbnail 来生成缩略图
  }
  
  // 回退到其他候选字段
  const fallbackCandidates = [
    x.cover,
    x.thumbnail,
    x.poster,
    x.image,
    x.image_url,
    Array.isArray(x.images) && x.images.length > 0 ? x.images[0] : null
  ]
  
  for (const candidate of fallbackCandidates) {
    if (candidate) {
      const resolved = resolveMediaUrl(candidate)
      if (resolved) {
        return resolved
      }
    }
  }
  
  return null
}