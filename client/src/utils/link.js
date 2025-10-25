// 解析卡片点击跳转（deeplink）
// 优先使用后端直接给的链接；否则按类型/可推断字段生成
export function linkFor(x = {}) {
  const direct = x.deepLink || x.deeplink || x.link || x.url
  if (typeof direct === 'string' && direct.trim()) return direct

  const type = (x.type || x.kind || '').toString().toLowerCase()

  // 优先：活动通常挂载券
  const couponId = x.couponId || x.coupon_id || (x.coupon && (x.coupon.id || x.couponId))
  if (couponId) return `/coupon/${couponId}`

  // 视频/图文内容
  if (type.includes('video') || x.videoId || x.video_id) {
    const vid = x.videoId || x.video_id || x.id
    return `/feed/video#${vid}`
  }
  if (type.includes('article') || x.postId || x.post_id) {
    const pid = x.postId || x.post_id || x.id
    return `/post/${pid}`
  }

  // 券/活动兜底
  if (type.includes('coupon') || type.includes('campaign')) {
    return `/coupon/${x.id}`
  }

  // 仍无法判断 → 回首页
  return '/'
}