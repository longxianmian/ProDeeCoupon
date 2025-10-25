import axios from 'axios'

// 直接使用相对路径，不依赖环境变量
const API_BASE = '/api'

export async function getPoints() {
  try {
    const token = localStorage.getItem('user_token')
    const response = await axios.get(`${API_BASE}/points/balance`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
    })
    return response.data
  } catch (error) {
    console.error('获取积分余额失败:', error)
    throw error
  }
}

export async function getPointsTransactions(params = {}) {
  try {
    const token = localStorage.getItem('user_token')
    const response = await axios.get(`${API_BASE}/points/transactions`, {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
    })
    return response.data
  } catch (error) {
    console.error('获取积分明细失败:', error)
    throw error
  }
}

export async function earnPoints(data) {
  try {
    const token = localStorage.getItem('user_token')
    const response = await axios.post(`${API_BASE}/points/earn`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
    })
    return response.data
  } catch (error) {
    console.error('赚取积分失败:', error)
    throw error
  }
}

export async function spendPoints(data) {
  try {
    const token = localStorage.getItem('user_token')
    const response = await axios.post(`${API_BASE}/points/spend`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
    })
    return response.data
  } catch (error) {
    console.error('消费积分失败:', error)
    throw error
  }
}

export async function getPointsQuote(orderAmountThb, wantUsePoints) {
  try {
    const token = localStorage.getItem('user_token')
    const response = await axios.post(
      `${API_BASE}/points/quote`,
      { 
        order_amount_thb: orderAmountThb,
        want_use_points: wantUsePoints
      },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
      }
    )
    return response.data
  } catch (error) {
    console.error('获取积分抵扣额度失败:', error)
    throw error
  }
}

export async function getRewards(params = {}) {
  try {
    const token = localStorage.getItem('user_token')
    const response = await axios.get(`${API_BASE}/rewards`, {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
    })
    return response.data
  } catch (error) {
    console.error('获取礼品列表失败:', error)
    throw error
  }
}

export async function getRewardDetail(rewardId) {
  try {
    const token = localStorage.getItem('user_token')
    const response = await axios.get(`${API_BASE}/rewards/${rewardId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
    })
    return response.data
  } catch (error) {
    console.error('获取礼品详情失败:', error)
    throw error
  }
}

export async function redeemReward(rewardId, idempotencyKey = null) {
  try {
    const token = localStorage.getItem('user_token')
    const key = idempotencyKey || `redeem_${rewardId}_${Date.now()}`
    const response = await axios.post(
      `${API_BASE}/rewards/redeem`,
      { item_id: rewardId },
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Idempotency-Key': key
        },
        withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
      }
    )
    return response.data
  } catch (error) {
    console.error('兑换礼品失败:', error)
    throw error
  }
}

export async function getRewardRedemptions(params = {}) {
  try {
    const token = localStorage.getItem('user_token')
    const response = await axios.get(`${API_BASE}/rewards/my-redemptions`, {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true  // ✅ 关键：让浏览器自动携带Cookie
    })
    return response.data
  } catch (error) {
    console.error('获取兑换记录失败:', error)
    throw error
  }
}

// 创建支付订单
export async function createPaymentOrder(data) {
  try {
    const token = localStorage.getItem('user_token')
    const response = await axios.post(`${API_BASE}/payments/create-order`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true
    })
    return response.data
  } catch (error) {
    console.error('创建支付订单失败:', error)
    throw error
  }
}

// 查询支付订单状态
export async function getPaymentStatus(orderNumber) {
  try {
    const token = localStorage.getItem('user_token')
    const response = await axios.get(`${API_BASE}/payments/status/${orderNumber}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true
    })
    return response.data
  } catch (error) {
    console.error('查询支付状态失败:', error)
    throw error
  }
}
