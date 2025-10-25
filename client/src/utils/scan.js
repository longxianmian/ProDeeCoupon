// 扫码解析工具：解析QR码内容并提取目标URL
export function parseScanText(value) {
  if (!value || typeof value !== 'string') {
    return { targetUrl: null }
  }

  const text = value.trim()
  
  // 直接是URL的情况
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return { targetUrl: text }
  }
  
  // 优惠券码格式：COUPON:123456 或 coupon-123456
  if (text.startsWith('COUPON:') || text.startsWith('coupon-')) {
    const couponId = text.replace(/^(COUPON:|coupon-)/, '')
    return { targetUrl: `/coupon/${couponId}` }
  }
  
  // 店铺绑定码格式：STORE:store_id:staff_id
  if (text.startsWith('STORE:')) {
    const parts = text.split(':')
    if (parts.length >= 3) {
      return { targetUrl: `/staff-binding?store=${parts[1]}&staff=${parts[2]}` }
    }
  }
  
  // 纯数字可能是优惠券验证码
  if (/^\d{6}$/.test(text)) {
    return { targetUrl: `/verify?code=${text}` }
  }
  
  // 其他格式暂不处理，返回原文本作为搜索参数
  return { targetUrl: `/search?q=${encodeURIComponent(text)}` }
}