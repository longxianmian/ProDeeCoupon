import { pickThumb } from '@/utils/thumb'
import { linkFor } from '@/utils/link'

// 使用空字符串，直接拼接相对路径
const BASE = ''
async function j(url){ const r=await fetch(BASE+url,{credentials:'include'}); if(!r.ok) throw new Error(await r.text()); return r.json() }

function q(params){
  const u = new URLSearchParams()
  Object.entries(params||{}).forEach(([k,v])=>{ if(v!==undefined && v!==null && v!=='') u.set(k,String(v)) })
  const s = u.toString(); return s ? ('?'+s) : ''
}

// 基础 API（存在则优先）
async function apiHomeFeed(params){ return j('/api/home/feed' + q(params)) }          // {coupons,videos,articles,nextPage}
async function apiHomeHot(params){  return j('/api/home/hot'  + q(params)) }           // 同上（可选）

// 兼容：分别请求三类（支持 category 透传）
async function apiCouponsFeatured(params){ return j('/api/coupons/featured' + q(params)) }
async function apiVideoFeed(params){        return j('/api/posts/video-feed' + q(params)) }
async function apiArticles(params){         return j('/api/posts' + q({ type:'article', status:'published', limit:20, ...params })) }

// 新增：活动 Campaigns（多端点尝试——任选其一即可命中）
async function apiCampaigns(p){
  const candidates = [
    ['/api/campaigns/home', p],
    ['/api/campaigns', { status:'active', home:1, limit:20, ...p }],
    ['/api/activities/home', p],
    ['/api/activities', { status:'published', featured:1, limit:20, ...p }]
  ]
  for (const [path, params] of candidates) {
    try { return await j(path + q(params)) } catch (_) {}
  }
  return []
}

// ===== 新增：把可能是对象/空值的列表安全转为数组 =====
function toArr(x){
  if (Array.isArray(x)) return x
  if (!x || typeof x !== 'object') return []
  // 常见包裹：{ items: [] } / { data: [] } / { results: [] } / { list: [] } / { rows: [] }
  for (const k of ['items','data','results','list','rows','records','videos','articles','coupons','campaigns']){
    if (Array.isArray(x[k])) return x[k]
  }
  return []
}

// ===== 工具：占位图（1:1.618） =====
const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 162"><rect width="100" height="162" fill="#f3f4f6"/></svg>'
)

// ===== 工具：视频缩略图生成器 =====
function getVideoThumbnail(video) {
  // 如果视频有poster或cover，优先使用
  if (video.poster || video.cover) {
    return video.poster || video.cover
  }
  
  // 生成视频播放按钮缩略图
  const videoThumb = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 162">
      <rect width="100" height="162" fill="#1a1a1a"/>
      <circle cx="50" cy="81" r="20" fill="rgba(255,255,255,0.8)"/>
      <polygon points="45,71 45,91 60,81" fill="#1a1a1a"/>
      <text x="50" y="120" text-anchor="middle" fill="white" font-size="8" font-family="Arial">视频</text>
    </svg>
  `)
  
  return videoThumb
}

// ===== 修改后的 normalize：所有列表用 toArr() 包一层 =====
function normalize({ coupons = [], videos = [], articles = [], campaigns = [] }){
  const C = toArr(coupons).map(x => {
    // 检查是否是视频类型
    const firstMedia = Array.isArray(x.media_files) && x.media_files.length > 0 ? x.media_files[0] : null
    const isVideo = firstMedia?.type === 'video'
    
    // 提取缩略图
    const thumbUrl = pickThumb(x)
    
    // 如果是视频且没有封面图（thumbUrl为null），才使用VideoThumbnail显示视频首帧
    // 如果有封面图，就直接用封面图，不使用VideoThumbnail
    const rawVideoUrl = (isVideo && !thumbUrl) ? (firstMedia.url || firstMedia.path || firstMedia.key) : null
    // 修复：如果URL已经以/api开头，不要重复添加
    const videoUrl = rawVideoUrl 
      ? (rawVideoUrl.startsWith('http') || rawVideoUrl.startsWith('/api/') ? rawVideoUrl : '/api' + rawVideoUrl) 
      : null
    
    return {
      kind: 'coupon',
      id: x.id,
      // 保留原始title作为fallback，但优先使用多语言字段
      title: x.title || x.name || 'Coupon',
      // 完整保留多语言字段，确保组件可以正确切换
      title_zh_cn: x.title_zh_cn || x.title || x.name,
      title_en_us: x.title_en_us || x.title || x.name,
      title_th_th: x.title_th_th || x.title || x.name,
      description_zh_cn: x.description_zh_cn || x.description,
      description_en_us: x.description_en_us || x.description,
      description_th_th: x.description_th_th || x.description,
      // 保留价格信息
      price_summary: x.price_summary,
      pricing: x.pricing,
      original_price: x.original_price,
      discount_price: x.discount_price,
      face_value: x.face_value,
      currency: x.currency,
      coupon_type: x.coupon_type,
      // 保留满减和折扣相关字段
      min_spend: x.min_spend,
      amount_off: x.amount_off,
      discount_percent: x.discount_percent,
      cap_amount: x.cap_amount,
      thumb: thumbUrl || PH,
      videoUrl: videoUrl,
      deeplink: linkFor({ ...x, type: 'coupon' }),
      stats: { left: x.left, views: x.views, comments: 0 },
      // 保留发布时间用于排序
      publishedAt: x.published_at || x.created_at || new Date().toISOString()
    }
  })

  const V = toArr(videos).map(x => {
    // 提取视频URL
    const videoFile = Array.isArray(x.media_files) ? x.media_files.find(f => f.type === 'video') : null
    const rawVideoUrl = videoFile?.url || videoFile?.path || videoFile?.key || null
    // 修复：如果URL已经以/api开头，不要重复添加
    const videoUrl = rawVideoUrl 
      ? (rawVideoUrl.startsWith('http') || rawVideoUrl.startsWith('/api/') ? rawVideoUrl : '/api' + rawVideoUrl) 
      : null
    
    return {
      kind: 'video',
      id: x.id,
      title: x.title || 'Video',
      // 保留多语言字段以支持视频标题切换
      title_zh_cn: x.title_zh_cn || x.title,
      title_en_us: x.title_en_us || x.title,
      title_th_th: x.title_th_th || x.title,
      description_zh_cn: x.description_zh_cn || x.description,
      description_en_us: x.description_en_us || x.description,
      description_th_th: x.description_th_th || x.description,
      thumb: pickThumb(x) || getVideoThumbnail(x) || PH,
      videoUrl: videoUrl,
      deeplink: linkFor({ ...x, type: 'video' }),
      likes_count: x.likes_count || 0,
      comments_count: x.comments_count || 0,
      favorites_count: x.favorites_count || 0,
      shares_count: x.shares_count || 0,
      // 保留发布时间用于排序
      publishedAt: x.published_at || x.created_at || new Date().toISOString()
    }
  })

  const A = toArr(articles).map(x => ({
    kind: 'article',
    id: x.id,
    title: x.title || 'Article',
    // 保留多语言字段以支持文章标题切换
    title_zh_cn: x.title_zh_cn || x.title,
    title_en_us: x.title_en_us || x.title,
    title_th_th: x.title_th_th || x.title,
    description_zh_cn: x.description_zh_cn || x.description,
    description_en_us: x.description_en_us || x.description,
    description_th_th: x.description_th_th || x.description,
    thumb: pickThumb(x) || PH,
    deeplink: linkFor({ ...x, type: 'article' }),
    likes_count: x.likes_count || 0,
    comments_count: x.comments_count || 0,
    favorites_count: x.favorites_count || 0,
    shares_count: x.shares_count || 0,
    // 保留发布时间用于排序
    publishedAt: x.published_at || x.created_at || new Date().toISOString()
  }))

  const M = toArr(campaigns).map(x => ({
    kind: 'campaign',
    id: x.id,
    title: x.title || x.name || 'Campaign',
    // 保留多语言字段以支持活动标题切换
    title_zh_cn: x.title_zh_cn || x.title || x.name,
    title_en_us: x.title_en_us || x.title || x.name,
    title_th_th: x.title_th_th || x.title || x.name,
    description_zh_cn: x.description_zh_cn || x.description,
    description_en_us: x.description_en_us || x.description,
    description_th_th: x.description_th_th || x.description,
    thumb: pickThumb(x) || PH,
    deeplink: linkFor({ ...x, type: (x.type || 'campaign') }),
    stats: { likes: x.likes, views: x.views, comments: x.commentsCount },
    // 保留优惠信息
    discount_text: x.discount_text || x.subtitle,
    // 保留发布时间用于排序
    publishedAt: x.published_at || x.start_date || x.created_at || new Date().toISOString()
  }))

  // 新的展现逻辑：
  // 1. 首先按照推送时间排序
  // 2. 然后按照4个内容卡片穿插1个活动卡片
  
  // 分离活动和内容
  // 活动卡片 = 推广活动（campaigns + 优惠券）
  // 内容卡片 = 纯内容（视频 + 文章）
  const activityCards = [...M, ...C]
  const contentCards = [...V, ...A]
  
  // 按发布时间降序排序（最新的在前）
  activityCards.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  contentCards.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  
  // 按照4:1比例穿插活动卡片
  const result = []
  let contentIndex = 0
  let activityIndex = 0
  
  while (contentIndex < contentCards.length || activityIndex < activityCards.length) {
    // 每次插入4个内容卡片
    for (let i = 0; i < 4 && contentIndex < contentCards.length; i++) {
      result.push(contentCards[contentIndex++])
    }
    
    // 然后插入1个活动卡片（如果还有的话）
    if (activityIndex < activityCards.length) {
      result.push(activityCards[activityIndex++])
    }
  }
  
  // 去重（以防万一）
  const seen = new Set()
  return result.filter(it => { 
    const k = `${it.kind}_${it.id}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export async function fetchHomeCards(tab='home', category='', province='bangkok', page=1){
  const p={ tab, category, province, page }
  try{
    const data = tab==='hot' ? await apiHomeHot(p) : await apiHomeFeed(p)
    // 若统一接口已返回 campaigns 字段，将被 normalize 合并
    return normalize(data)
  }catch(err){
    console.error('❌ 首页数据加载失败:', err.message || err)
  }
  const [c,v,a,m]=await Promise.allSettled([
    apiCouponsFeatured({ category, province, page }).catch(()=>[]),
    apiVideoFeed({ category, province, page }).catch(()=>[]),
    apiArticles({ category, province, page }).catch(()=>[]),
    apiCampaigns({ category, province, page }).catch(()=>[])
  ])
  const coupons = c.status==='fulfilled'?c.value:[]
  const videos  = v.status==='fulfilled'?v.value:[]
  const articles= a.status==='fulfilled'?a.value:[]
  const campaigns = m.status==='fulfilled'?m.value:[]
  return normalize({coupons,videos,articles,campaigns})
}