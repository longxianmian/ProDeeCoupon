<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLocalizedContent } from '@/utils/i18n'
import { useAuthStore } from '@/stores/auth'
import { createComment } from '../services/content'
import axios from 'axios'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import CommentsThread from '../components/CommentsThread.vue'
import ContentCTA from '@/components/ContentCTA.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { locale, t } = useI18n()
const { getLocalizedTitle, getLocalizedContent } = useLocalizedContent()

const post = ref(null)
const comments = ref([])
const loading = ref(true)
const showCommentInput = ref(false)
const commentText = ref('')

const modules = [Pagination]

const localizedTitle = computed(() => post.value ? getLocalizedTitle(post.value) : '')
const localizedPostContent = computed(() => post.value ? getLocalizedContent(post.value) : '')
const localeForDate = computed(() => {
  const localeMap = {
    'zh-cn': 'zh-CN',
    'en-us': 'en-US',
    'th-th': 'th-TH'
  }
  return localeMap[locale.value] || 'zh-CN'
})
const authorDisplayName = computed(() => {
  if (!post.value?.author) return ''
  const role = post.value.author.role
  if (role === 'super_admin') {
    return t('common.officialAccount')
  } else if (role === 'content_operator') {
    return post.value.author.display_name || t('common.contentOperator')
  }
  return post.value.author.nickname || post.value.author.display_name || ''
})

function goHome() { 
  router.push('/') 
}

function sanitizeHtml(html) {
  if (!html) return ''
  
  // 允许的HTML标签（包含<a>用于链接）
  const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'span', 'div']
  const voidTags = ['br']
  
  let cleaned = html
    // 移除所有危险标签及其内容
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|select|button|img|video)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|select|button|img|video)[^>]*\/?>/gi, '')
    
    // 移除所有事件处理器
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^"'\s>]*/gi, '')
    
    // 移除危险协议（但保留http/https）
    .replace(/href\s*=\s*["']?javascript:/gi, 'href="#"')
    .replace(/href\s*=\s*["']?vbscript:/gi, 'href="#"')
    .replace(/href\s*=\s*["']?data:/gi, 'href="#"')
    
    // 移除危险属性（但保留href）
    .replace(/\s*(action|formaction|background|cite|codebase|dynsrc|lowsrc)\s*=/gi, '')
  
  // 只保留白名单标签，移除其他所有标签但保留内容
  cleaned = cleaned.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (match, tagName, attrs) => {
    const tag = tagName.toLowerCase()
    if (allowedTags.includes(tag)) {
      if (voidTags.includes(tag)) {
        return `<${tag}>`
      }
      
      // 对于<a>标签，保留安全的href属性
      if (tag === 'a' && !match.includes('/')) {
        // 提取href属性
        const hrefMatch = attrs.match(/href\s*=\s*["']?([^"'\s>]+)["']?/i)
        if (hrefMatch && (hrefMatch[1].startsWith('http://') || hrefMatch[1].startsWith('https://') || hrefMatch[1].startsWith('/'))) {
          return `<a href="${hrefMatch[1]}" target="_blank" rel="noopener noreferrer">`
        }
        return '<a>'
      }
      
      return match.includes('/') ? `</${tag}>` : `<${tag}>`
    }
    return '' // 移除不在白名单中的标签
  })
  
  return cleaned
}

async function loadPost() {
  try {
    const response = await axios.get(`/api/posts/${route.params.id}`, {
      headers: authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}
    })
    if (response.data.success) {
      post.value = response.data.data
    }
  } catch (error) {
    console.error('Failed to load post:', error)
  } finally {
    loading.value = false
  }
}

async function loadComments() {
  try {
    const response = await axios.get(`/api/posts/${route.params.id}/comments`)
    if (response.data.success) {
      comments.value = response.data.data || []
    }
  } catch (error) {
    console.error('Failed to load comments:', error)
  }
}

onMounted(async () => {
  await loadPost()
  await loadComments()
})

async function toggleLike() {
  if (!authStore.isAuthenticated) {
    alert(t('common.pleaseLogin'))
    return
  }
  
  try {
    if (post.value.user_liked) {
      await axios.delete(`/api/posts/${post.value.id}/like`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      post.value.user_liked = false
      post.value.likes_count--
    } else {
      await axios.post(`/api/posts/${post.value.id}/like`, {}, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      post.value.user_liked = true
      post.value.likes_count++
    }
  } catch (error) {
    console.error('Failed to toggle like:', error)
  }
}

async function toggleFavorite() {
  if (!authStore.isAuthenticated) {
    alert(t('common.pleaseLogin'))
    return
  }
  
  try {
    if (post.value.user_favorited) {
      await axios.delete(`/api/posts/${post.value.id}/favorite`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      post.value.user_favorited = false
      post.value.favorites_count--
    } else {
      await axios.post(`/api/posts/${post.value.id}/favorite`, {}, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      post.value.user_favorited = true
      post.value.favorites_count++
    }
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
  }
}

async function handleShare() {
  try {
    await axios.post(`/api/posts/${post.value.id}/share`)
    post.value.shares_count++
    
    if (navigator.share) {
      await navigator.share({
        title: localizedTitle.value,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert(t('postDetail.linkCopied'))
    }
  } catch (error) {
    console.error('Failed to share:', error)
  }
}

function openCommentInput() {
  if (!authStore.isAuthenticated) {
    alert(t('common.pleaseLogin'))
    return
  }
  showCommentInput.value = true
}

async function submitComment() {
  if (!commentText.value.trim()) return
  
  try {
    const c = await createComment(post.value.id, { content: commentText.value })
    comments.value = [{ ...c, replies: [] }, ...comments.value]
    commentText.value = ''
    showCommentInput.value = false
    post.value.comments_count++
  } catch (error) {
    console.error('Failed to submit comment:', error)
  }
}

async function onReply({ parentId, content }) {
  const c = await createComment(post.value.id, { parentId, content })
  
  if (!parentId) {
    comments.value = [{ ...c, replies: [] }, ...comments.value]
  } else {
    insertReplyToParent(comments.value, parentId, { ...c, replies: [] })
  }
  post.value.comments_count++
}

function insertReplyToParent(commentList, parentId, newReply) {
  for (const comment of commentList) {
    if (comment.id === parentId) {
      if (!comment.replies) comment.replies = []
      comment.replies.unshift(newReply)
      return true
    }
    if (comment.replies && insertReplyToParent(comment.replies, parentId, newReply)) {
      return true
    }
  }
  return false
}

function formatCount(count) {
  if (!count || count === 0) return '0'
  if (count >= 10000) return (count / 10000).toFixed(1) + 'w'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return count.toString()
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${day}/${month}`
}
</script>

<template>
  <div class="page-wrapper">
    <header class="appbar">
      <button class="back-btn" @click="goHome">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="author-section" v-if="post?.author">
        <img :src="post.author.avatar" @error="($event.target.src='https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg')" class="author-avatar" />
        <div class="author-name">{{ authorDisplayName }}</div>
        <button v-if="post.author.role === 'content_operator'" class="follow-btn">{{ $t('postDetail.follow') }}</button>
      </div>
      <button class="share-btn" @click="handleShare">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </header>
    <div class="appbar-spacer" />
    
    <div v-if="loading" class="loading">{{ $t('postDetail.loading') }}</div>
    
    <div v-else-if="post" class="content-wrapper">
      <div v-if="post.media_files?.length" class="media-swiper">
        <Swiper
          :modules="modules"
          :pagination="{ clickable: true }"
          :loop="false"
          class="swiper-container"
        >
          <SwiperSlide v-for="(file, i) in post.media_files" :key="i">
            <div v-if="file.type === 'video'" class="media-item">
              <video :src="file.url" controls playsinline webkit-playsinline class="media-video">
                {{ $t('postDetail.videoNotSupported') }}
              </video>
            </div>
            <div v-else class="media-item">
              <img :src="file.url" class="media-image" />
            </div>
          </SwiperSlide>
        </Swiper>
      </div>

      <h1 class="post-title">{{ localizedTitle }}</h1>

      <div class="post-content" v-html="sanitizeHtml(localizedPostContent)"></div>

      <ContentCTA v-if="post" :post="post" mode="text" />

      <div class="post-meta">
        <span v-if="post.published_at">{{ formatDate(post.published_at) }}</span>
        <span v-if="post.author?.province"> {{ post.author.province }}</span>
      </div>

      <div class="divider"></div>

      <div class="interaction-stats">
        <button class="stat-btn" @click="toggleLike">
          <svg width="20" height="20" viewBox="0 0 24 24" :fill="post.user_liked ? '#ff2442' : 'none'">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" :stroke="post.user_liked ? '#ff2442' : 'currentColor'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ formatCount(post.likes_count) }}</span>
        </button>
        
        <button class="stat-btn" @click="openCommentInput">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ formatCount(post.comments_count) }}</span>
        </button>
        
        <button class="stat-btn" @click="toggleFavorite">
          <svg width="20" height="20" viewBox="0 0 24 24" :fill="post.user_favorited ? '#ffd21e' : 'none'">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" :stroke="post.user_favorited ? '#ffd21e' : 'currentColor'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ formatCount(post.favorites_count) }}</span>
        </button>

        <button class="stat-btn" @click="handleShare">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ formatCount(post.shares_count) }}</span>
        </button>
      </div>

      <div class="comments-header">
        <span class="comments-title">{{ $t('postDetail.commentsCount', { count: post.comments_count }) }}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M3 4h18M3 12h18M3 20h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>

      <CommentsThread :comments="comments" @reply="onReply" />

      <div class="bottom-spacer"></div>
    </div>

    <div class="bottom-bar">
      <button class="emoji-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      
      <input 
        v-if="showCommentInput"
        v-model="commentText"
        @keyup.enter="submitComment"
        class="comment-input"
        :placeholder="$t('postDetail.commentPlaceholder')"
        @blur="() => { if (!commentText.trim()) showCommentInput = false }"
      />
      <div v-else class="comment-placeholder" @click="openCommentInput">
        {{ $t('postDetail.commentPlaceholder') }}
      </div>

      <div class="bottom-stats">
        <button class="bottom-stat" @click="toggleLike">
          <svg width="20" height="20" viewBox="0 0 24 24" :fill="post?.user_liked ? '#ff2442' : 'none'">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" :stroke="post?.user_liked ? '#ff2442' : 'currentColor'" stroke-width="2"/>
          </svg>
          <span>{{ formatCount(post?.likes_count) }}</span>
        </button>
        
        <button class="bottom-stat" @click="toggleFavorite">
          <svg width="20" height="20" viewBox="0 0 24 24" :fill="post?.user_favorited ? '#ffd21e' : 'none'">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" :stroke="post?.user_favorited ? '#ffd21e' : 'currentColor'" stroke-width="2"/>
          </svg>
          <span>{{ formatCount(post?.favorites_count) }}</span>
        </button>
        
        <button class="bottom-stat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>{{ formatCount(post?.comments_count) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 60px;
}

.appbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}

.back-btn, .share-btn {
  border: none;
  background: transparent;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #333;
}

.title-bar {
  flex: 1;
  font-weight: 600;
  font-size: 16px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 8px;
}

.appbar-spacer {
  height: 48px;
}

.loading {
  padding: 40px;
  text-align: center;
  color: #999;
}

.content-wrapper {
  padding: 0;
}

.author-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  margin: 0 8px;
}

.author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.author-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-btn {
  padding: 4px 14px;
  border: none;
  background: #ff2442;
  color: #fff;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.post-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  margin: 0;
  padding: 0 16px 12px;
  color: #333;
}

.media-swiper {
  width: 100%;
  margin-bottom: 16px;
}

.swiper-container {
  width: 100%;
  aspect-ratio: 1;
}

.media-item {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.media-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.swiper-container :deep(.swiper-pagination) {
  bottom: 12px;
}

.swiper-container :deep(.swiper-pagination-bullet) {
  background: #fff;
  opacity: 0.6;
}

.swiper-container :deep(.swiper-pagination-bullet-active) {
  opacity: 1;
}

.post-content {
  padding: 0 16px 16px;
  font-size: 15px;
  line-height: 1.8;
  color: #333;
}

.post-content :deep(p) {
  margin: 8px 0;
}

.post-content :deep(strong), 
.post-content :deep(b) {
  font-weight: 600;
}

.post-content :deep(em), 
.post-content :deep(i) {
  font-style: italic;
}

.post-content :deep(h1), 
.post-content :deep(h2), 
.post-content :deep(h3) {
  font-weight: 700;
  margin: 12px 0;
}

.post-content :deep(ul), 
.post-content :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.post-content :deep(a) {
  color: #ff2442;
  text-decoration: none;
}

.post-meta {
  padding: 0 16px 12px;
  font-size: 13px;
  color: #999;
}

.post-meta span:not(:last-child)::after {
  content: ' ';
  margin: 0 4px;
}

.divider {
  height: 1px;
  background: #f0f0f0;
  margin: 12px 16px;
}

.interaction-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
}

.stat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  padding: 0;
}

.stat-btn:active {
  transform: scale(0.95);
}

.stat-btn svg {
  flex-shrink: 0;
}

.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px;
}

.comments-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.bottom-spacer {
  height: 20px;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  z-index: 99;
}

.emoji-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  flex-shrink: 0;
}

.comment-placeholder {
  flex: 1;
  height: 36px;
  background: #f5f5f5;
  border-radius: 18px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  color: #999;
  font-size: 14px;
  cursor: text;
}

.comment-input {
  flex: 1;
  height: 36px;
  background: #f5f5f5;
  border: none;
  border-radius: 18px;
  padding: 0 16px;
  font-size: 14px;
  outline: none;
}

.bottom-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.bottom-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  padding: 0;
}

.bottom-stat svg {
  flex-shrink: 0;
}
</style>
