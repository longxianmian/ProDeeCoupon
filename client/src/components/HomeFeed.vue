<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { fetchHomeCards } from '@/services/feed'
import { useLocalizedContent } from '@/utils/i18n'
import { useAudioUnlock } from '@/composables/useAudioUnlock'
import VideoThumbnail from './VideoThumbnail.vue'
import { resolveMediaUrl } from '@/utils/mediaUrl'

const { t, locale } = useI18n()
const { getLocalizedTitle, getLocalizedDescription } = useLocalizedContent()
const { unlockAudio } = useAudioUnlock()
const router = useRouter()
const props = defineProps({ tab: { type:String, default:'home' }, category: { type:String, default:'' } })
const loading = ref(true), error = ref(''), cards = ref([])

// 数据缓存
const cache = new Map()
const CACHE_TIME = 60000 // 1分钟缓存

// 图片加载错误处理
function handleImageError(event) {
  event.target.style.display = 'none'
}

// 格式化价格显示
function formatPrice(card) {
  // 使用多语言化的价格显示，不依赖服务器的price_summary
  // 根据coupon_type计算价格显示
  const currency = card.currency || '฿'
  
  switch (card.coupon_type) {
    case 'final_price':
      // 最终价格型：原价 → 优惠价
      if (card.original_price && card.discount_price) {
        return `${currency}${card.original_price} → ${currency}${card.discount_price}`
      } else if (card.discount_price) {
        return `${currency}${card.discount_price}`
      }
      break
      
    case 'gift_card':
      // 礼品卡型：使用模板格式化  
      if (card.face_value) {
        return t('coupon.giftCardValueFormat', { value: `${currency}${card.face_value}` })
      }
      break
      
    case 'full_reduction':
      // 满减型：使用模板格式化
      if (card.min_spend && card.amount_off) {
        return t('coupon.fullReductionFormat', { 
          minSpend: `${currency}${card.min_spend}`, 
          discount: `${currency}${card.amount_off}` 
        })
      } else if (card.amount_off) {
        return t('coupon.fixedDiscountFormat', { amount: `${currency}${card.amount_off}` })
      }
      break
      
    case 'discount':
      // 折扣型：XX%折扣
      if (card.discount_percent) {
        return `${card.discount_percent}% ${t('coupon.discount')}`
      }
      break
      
    case 'percentage_discount':
      // 百分比折扣券：使用模板格式化
      if (card.discount_percent) {
        let summary = t('coupon.percentageOffFormat', { rate: card.discount_percent })
        if (card.min_spend) {
          summary += ` (${t('coupon.spend')} ${currency}${card.min_spend})`
        }
        return summary
      }
      break
      
    case 'fixed_discount':
      // 固定折扣券：使用模板格式化
      if (card.amount_off) {
        let summary = t('coupon.fixedDiscountFormat', { amount: `${currency}${card.amount_off}` })
        if (card.min_spend) {
          summary += ` (${t('coupon.spend')} ${currency}${card.min_spend})`
        }
        return summary
      }
      break
      
    case 'cash_voucher':
      // 抵用券：使用模板格式化
      if (card.amount_off) {
        return t('coupon.giftCardValueFormat', { value: `${currency}${card.amount_off}` })
      }
      break
      
    default:
      // 通用：显示最低价格
      if (card.discount_price) {
        return `${currency}${card.discount_price}`
      } else if (card.original_price) {
        return `${currency}${card.original_price}`
      }
  }
  
  return null
}

async function load(){
  const cacheKey = `${props.tab}-${props.category}`
  const now = Date.now()
  
  // 检查缓存
  const cached = cache.get(cacheKey)
  if (cached && (now - cached.timestamp < CACHE_TIME)) {
    cards.value = cached.data
    console.log('📦 Using cached cards:', cached.data.length)
    // 调试第一个卡片
    if (cached.data[0]) {
      console.log('🎯 First cached card:', {
        id: cached.data[0].id,
        kind: cached.data[0].kind,
        hasVideoUrl: !!cached.data[0].videoUrl,
        videoUrl: cached.data[0].videoUrl,
        hasThumb: !!cached.data[0].thumb
      })
    }
    loading.value = false
    return
  }
  
  loading.value = true; error.value=''
  try { 
    const data = await fetchHomeCards(props.tab, props.category)
    cards.value = data
    
    // 调试：打印前3个卡片信息
    console.log('📊 CARDS LOADED:', data.length)
    data.slice(0, 3).forEach((c, i) => {
      console.log(`🎯 Card ${i}:`, { 
        id: c.id, 
        kind: c.kind, 
        title: c.title?.substring(0, 20),
        likes_count: c.likes_count,
        comments_count: c.comments_count,
        favorites_count: c.favorites_count,
        shares_count: c.shares_count,
        hasVideoUrl: !!c.videoUrl, 
        videoUrl: c.videoUrl,
        hasThumb: !!c.thumb,
        thumb: c.thumb?.substring(0, 60)
      })
    })
    
    // 缓存数据
    cache.set(cacheKey, {
      data,
      timestamp: now
    })
  }
  catch(e){ error.value = String(e) }
  finally{ loading.value = false }
}

// 处理卡片点击，特别是视频卡片
async function onCardClick(card, event) {
  // 用这一下点击顺带解锁声音（关键）
  await unlockAudio()
  
  // 如果是视频类型，使用同文档跳转到视频页面
  if (card.kind === 'video' || card.deeplink.includes('/feed/video')) {
    event.preventDefault()
    router.push(card.deeplink)
  }
  // 其他类型走正常的 router-link 导航
}

// 格式化数量显示（与详情页保持一致）
function formatCount(count) {
  if (!count || count === 0) return '0'
  if (count >= 10000) return (count / 10000).toFixed(1) + 'w'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return count.toString()
}

watch(() => [props.tab, props.category], load)
onMounted(load)
</script>

<template>
  <section class="home">
    <div v-if="loading" class="skeleton">
      <div v-for="i in 6" :key="i" class="sk" />
    </div>
    <div v-else-if="error" class="err">{{ error }}</div>
    <div v-else-if="!cards.length" class="empty">{{ t('common.noContent') }}</div>

    <!-- CSS columns 实现瀑布 -->
    <div v-else class="masonry">
      <router-link v-for="c in cards" :key="`${c.kind}-${c.id}`" :to="c.deeplink" class="card" :class="c.kind" @click="onCardClick(c, $event)">
        <div class="thumb">
          <VideoThumbnail v-if="c.videoUrl" :videoUrl="c.videoUrl" />
          <img v-else :src="c.thumb" alt="" loading="lazy" @error="handleImageError"/>
        </div>
        <div class="meta">
          <div class="title" :title="getLocalizedTitle(c)">{{ getLocalizedTitle(c) }}</div>
          <!-- 优惠券显示价格 -->
          <div class="stats" v-if="c.kind === 'coupon' && formatPrice(c)">
            <span class="price">{{ formatPrice(c) }}</span>
          </div>
          <!-- 活动卡片显示优惠信息 -->
          <div class="stats" v-else-if="c.kind === 'campaign' && c.discount_text">
            <span class="price">{{ c.discount_text }}</span>
          </div>
          <!-- 内容卡片（文章和视频）显示4个互动图标 -->
          <div class="interaction-bar" v-else-if="c.kind === 'video' || c.kind === 'article'">
            <span class="interact-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ formatCount(c.likes_count) }}
            </span>
            <span class="interact-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ formatCount(c.comments_count) }}
            </span>
            <span class="interact-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ formatCount(c.favorites_count) }}
            </span>
            <span class="interact-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ formatCount(c.shares_count) }}
            </span>
          </div>
        </div>
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.home{padding:3px;background:#e6e6e6}
/* 骨架屏 */
.skeleton{column-count:2;column-gap:3px}
.sk{display:inline-block;width:100%;height:0;padding-top:161.8%;margin:0 0 3px;border-radius:12px;background:linear-gradient(90deg,#f9fafb,#f3f4f6,#f9fafb);background-size:200% 100%;animation:shimmer 1.5s ease-in-out infinite}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

/* 瀑布：两列 */
.masonry{column-count:2;column-gap:3px}
.card{display:inline-block;width:100%;margin:0 0 3px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);text-decoration:none;color:inherit;break-inside:avoid}
/* 卡片固定 1:1.618，内部上下分区 */
.card{position:relative}
.card::before{content:"";display:block;padding-top:161.8%}
.thumb,.meta{position:absolute;left:0;right:0}
.thumb{top:0;height:66.666%}
.thumb img{width:100%;height:100%;object-fit:cover}
.meta{bottom:0;height:33.333%;padding:6px 8px;display:flex;flex-direction:column;justify-content:space-between;background:#fff}
.title{font-weight:600;line-height:1.2;font-size:13px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin-bottom:2px;word-break:break-word}
.stats{font-size:12px;color:#9ca3af;display:flex;align-items:center;gap:12px}
.stats .price{color:#ff6b35;font-weight:600;font-size:13px}
.interaction-bar{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#6b7280}
.interact-btn{display:flex;align-items:center;gap:3px}
.interact-btn svg{flex-shrink:0}
.err{color:#ef4444;padding:3px}
.empty{color:#6b7280;padding:3px;text-align:center}
</style>