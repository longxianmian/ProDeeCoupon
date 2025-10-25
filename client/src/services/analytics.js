import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto-js';

const SESSION_KEY = 'pd_session_id';
const UA = navigator.userAgent || '';

/**
 * 获取或创建会话ID
 */
export function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) { 
    sid = uuidv4(); 
    localStorage.setItem(SESSION_KEY, sid); 
  }
  return sid;
}

/**
 * 获取用户哈希值（如果已登录）
 */
export function getUserHash() {
  const lineUserId = localStorage.getItem('line_user_id');
  if (lineUserId) {
    return crypto.SHA256(lineUserId).toString();
  }
  return 'anon';
}

/**
 * 构建会话上下文信息
 */
export function buildSessionCtx(extra = {}) {
  const sid = getSessionId();
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    id: sid,
    userHash: getUserHash(),
    is_line: !!window.liff,
    province: localStorage.getItem('user-province') || undefined,
    lang: localStorage.getItem('user-language') || undefined,
    utm_source: urlParams.get('utm_source') || localStorage.getItem('utm_source') || undefined,
    utm_medium: urlParams.get('utm_medium') || localStorage.getItem('utm_medium') || undefined,
    utm_campaign: urlParams.get('utm_campaign') || localStorage.getItem('utm_campaign') || undefined,
    utm_content: urlParams.get('utm_content') || localStorage.getItem('utm_content') || undefined,
    utm_term: urlParams.get('utm_term') || localStorage.getItem('utm_term') || undefined,
    menu_id: urlParams.get('menu_id') || localStorage.getItem('menu_id') || undefined,
    slot: urlParams.get('slot') || localStorage.getItem('menu_slot') || undefined,
    referrer: document.referrer || undefined,
    ...extra,
  };
}

/**
 * 保存UTM参数到本地存储
 */
export function saveUtmParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'menu_id', 'slot'];
  
  utmKeys.forEach(key => {
    const value = urlParams.get(key);
    if (value) {
      localStorage.setItem(key === 'slot' ? 'menu_slot' : key, value);
    }
  });
}

/**
 * 发送埋点事件
 */
export async function track(payload) {
  try {
    const body = Array.isArray(payload) ? payload : [payload];
    
    body.forEach(e => { 
      e.id = e.id || uuidv4();
      e.session = e.session || buildSessionCtx(); 
      e.ua = UA; 
    });
    
    await fetch('/api/analytics/track', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body)
    });
  } catch (e) { 
    // 静默失败，避免影响用户体验
    console.warn('Analytics tracking failed:', e);
  }
}

/**
 * 页面浏览事件
 */
export function trackPageView(route) {
  track({ 
    type: 'page_view', 
    route: route 
  });
}

/**
 * 优惠券详情查看事件
 */
export function trackCouponDetail(couponId, campaignId = null) {
  track({ 
    type: 'detail_view', 
    content_id: couponId?.toString(),
    campaign_id: campaignId?.toString()
  });
}

/**
 * 优惠券领取成功事件
 */
export function trackCouponClaim(couponId, campaignId = null) {
  track({ 
    type: 'claim_ok', 
    content_id: couponId?.toString(),
    campaign_id: campaignId?.toString()
  });
}

/**
 * 优惠券核销成功事件
 */
export function trackCouponRedeem(couponId, campaignId = null, storeId = null) {
  track({ 
    type: 'redeem_ok', 
    content_id: couponId?.toString(),
    campaign_id: campaignId?.toString(),
    meta: { store_id: storeId }
  });
}

/**
 * 卡片展示事件
 */
export function trackCardImpression(contentId, campaignId = null) {
  track({ 
    type: 'card_impression', 
    content_id: contentId?.toString(),
    campaign_id: campaignId?.toString()
  });
}

/**
 * 卡片点击事件
 */
export function trackCardClick(contentId, campaignId = null) {
  track({ 
    type: 'card_click', 
    content_id: contentId?.toString(),
    campaign_id: campaignId?.toString()
  });
}

/**
 * 视频播放进度事件
 */
export function trackVideoProgress(contentId, progress) {
  track({ 
    type: 'video_progress', 
    content_id: contentId?.toString(),
    value: progress
  });
}

/**
 * 自定义事件
 */
export function trackCustomEvent(type, data = {}) {
  track({ 
    type, 
    ...data
  });
}