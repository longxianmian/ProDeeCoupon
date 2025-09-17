// 券类型价格处理工具函数

/**
 * 根据券类型生成价格摘要文本
 * @param {Object} coupon - 优惠券数据
 * @returns {string} - 价格摘要文本
 */
function generatePriceSummary(coupon) {
  const type = coupon.coupon_type || 'final_price'
  const currency = coupon.currency || 'THB'
  const currencySymbol = getCurrencySymbol(currency)
  
  switch (type) {
    case 'final_price':
      // 最终价券：原价 ¥100 → 现价 ¥80
      if (coupon.original_price && coupon.discount_price) {
        return `${currencySymbol}${coupon.original_price} → ${currencySymbol}${coupon.discount_price}`
      }
      return coupon.price_final ? `${currencySymbol}${coupon.price_final}` : '价格待定'
      
    case 'gift_card':
      // 礼品券：面值 ¥100
      return coupon.face_value ? `面值 ${currencySymbol}${coupon.face_value}` : '面值待定'
      
    case 'cash_voucher':
      // 抵用券：抵用 ¥50
      return coupon.amount_off ? `抵用 ${currencySymbol}${coupon.amount_off}` : '抵用金额待定'
      
    case 'full_reduction':
      // 满减券：满 ¥200 减 ¥30
      if (coupon.min_spend && coupon.amount_off) {
        return `满 ${currencySymbol}${coupon.min_spend} 减 ${currencySymbol}${coupon.amount_off}`
      }
      return '满减条件待定'
      
    case 'percentage_discount':
      // 折扣券：8折优惠 (满¥100)
      if (coupon.discount_percent) {
        const discount = (100 - parseFloat(coupon.discount_percent)) / 10
        let summary = `${discount}折优惠`
        if (coupon.min_spend) {
          summary += ` (满${currencySymbol}${coupon.min_spend})`
        }
        if (coupon.cap_amount) {
          summary += ` (最高优惠${currencySymbol}${coupon.cap_amount})`
        }
        return summary
      }
      return '折扣待定'
      
    case 'fixed_discount':
      // 固定金额折扣券：减¥20 (满¥100)
      if (coupon.amount_off) {
        let summary = `减 ${currencySymbol}${coupon.amount_off}`
        if (coupon.min_spend) {
          summary += ` (满${currencySymbol}${coupon.min_spend})`
        }
        return summary
      }
      return '折扣金额待定'
      
    default:
      return '价格待定'
  }
}

/**
 * 获取货币符号
 * @param {string} currency - 货币代码
 * @returns {string} - 货币符号
 */
function getCurrencySymbol(currency) {
  const symbols = {
    'CNY': '¥',
    'USD': '$',
    'EUR': '€',
    'THB': '฿',
    'JPY': '¥'
  }
  return symbols[currency] || currency
}

/**
 * 验证券类型数据
 * @param {Object} data - 券数据
 * @returns {Object} - 验证结果 {valid: boolean, errors: string[]}
 */
function validateCouponPricing(data) {
  const errors = []
  const type = data.coupon_type || 'final_price'
  
  switch (type) {
    case 'final_price':
      // 最终价券需要price_final或者original_price+discount_price
      if (!data.price_final && (!data.original_price || !data.discount_price)) {
        errors.push('最终价券需要设置最终价格或原价/现价')
      }
      break
      
    case 'gift_card':
      // 礼品券需要面值
      if (!data.face_value || parseFloat(data.face_value) <= 0) {
        errors.push('礼品券需要设置有效的面值')
      }
      break
      
    case 'cash_voucher':
      // 抵用券需要抵用金额
      if (!data.amount_off || parseFloat(data.amount_off) <= 0) {
        errors.push('抵用券需要设置有效的抵用金额')
      }
      break
      
    case 'full_reduction':
      // 满减券需要满金额和减金额
      if (!data.min_spend || parseFloat(data.min_spend) <= 0) {
        errors.push('满减券需要设置有效的最低消费金额')
      }
      if (!data.amount_off || parseFloat(data.amount_off) <= 0) {
        errors.push('满减券需要设置有效的减免金额')
      }
      if (data.min_spend && data.amount_off && parseFloat(data.amount_off) >= parseFloat(data.min_spend)) {
        errors.push('减免金额不能大于或等于最低消费金额')
      }
      break
      
    case 'percentage_discount':
      // 折扣券需要折扣百分比
      if (!data.discount_percent || parseFloat(data.discount_percent) <= 0 || parseFloat(data.discount_percent) >= 100) {
        errors.push('折扣券需要设置0-100之间的折扣百分比')
      }
      // 最低消费和封顶金额可选但需要有效
      if (data.min_spend && parseFloat(data.min_spend) <= 0) {
        errors.push('最低消费金额必须大于0')
      }
      if (data.cap_amount && parseFloat(data.cap_amount) <= 0) {
        errors.push('封顶金额必须大于0')
      }
      break
      
    case 'fixed_discount':
      // 固定折扣券需要折扣金额
      if (!data.amount_off || parseFloat(data.amount_off) <= 0) {
        errors.push('固定折扣券需要设置有效的折扣金额')
      }
      if (data.min_spend && parseFloat(data.min_spend) <= 0) {
        errors.push('最低消费金额必须大于0')
      }
      if (data.min_spend && data.amount_off && parseFloat(data.amount_off) >= parseFloat(data.min_spend)) {
        errors.push('折扣金额不能大于或等于最低消费金额')
      }
      break
      
    default:
      errors.push('不支持的券类型')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 为券数据添加价格摘要
 * @param {Object} coupon - 券数据
 * @returns {Object} - 增强后的券数据
 */
function enhanceCouponWithPricing(coupon) {
  return {
    ...coupon,
    price_summary: generatePriceSummary(coupon),
    pricing: {
      type: coupon.coupon_type,
      final: coupon.price_final,
      original: coupon.original_price,
      discount: coupon.discount_price,
      faceValue: coupon.face_value,
      amountOff: coupon.amount_off,
      minSpend: coupon.min_spend,
      discountPercent: coupon.discount_percent,
      capAmount: coupon.cap_amount,
      currency: coupon.currency
    }
  }
}

module.exports = {
  generatePriceSummary,
  getCurrencySymbol,
  validateCouponPricing,
  enhanceCouponWithPricing
}