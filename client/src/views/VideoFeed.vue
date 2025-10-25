<template>
  <div class="video-feed" 
       @touchstart="handleTouchStart" 
       @touchmove="handleTouchMove" 
       @touchend="handleTouchEnd">
    
    <!-- 视频容器 -->
    <div class="video-container">
      <!-- 当前视频 -->
      <div class="video-item" v-if="currentVideo" :class="{ 'video-switching': isSwitching }">
        <video
          ref="videoRef"
          :src="currentVideo.videoUrl"
          class="video-player"
          playsinline
          webkit-playsinline
          loop
          @click="togglePlayPause"
          @timeupdate="handleTimeUpdate"
          @loadedmetadata="handleLoadedMetadata"
          @ended="handleVideoEnded"
        ></video>

        <!-- 返回按钮 -->
        <button class="back-btn" @click="goBack">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- 右侧互动按钮 -->
        <div class="actions">
          <!-- 作者头像和关注按钮 -->
          <div class="author-avatar-container" v-if="currentVideo.author">
            <div class="avatar-wrapper">
              <img :src="currentVideo.author.avatar || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg'" class="action-avatar" />
              <button class="follow-btn" @click="toggleFollow" v-if="!isFollowing">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="white" stroke-width="3" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <button class="action-btn" @click="toggleLike">
            <svg width="32" height="32" viewBox="0 0 24 24" :fill="currentVideo.user_liked ? '#ff2442' : 'none'">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" :stroke="currentVideo.user_liked ? '#ff2442' : 'white'" stroke-width="2"/>
            </svg>
            <span>{{ formatCount(currentVideo.likes_count) }}</span>
          </button>

          <button class="action-btn" @click="openComments">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="white" stroke-width="2"/>
            </svg>
            <span>{{ formatCount(currentVideo.comments_count) }}</span>
          </button>

          <button class="action-btn" @click="toggleFavorite">
            <svg width="32" height="32" viewBox="0 0 24 24" :fill="currentVideo.user_favorited ? '#ffd21e' : 'none'">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" :stroke="currentVideo.user_favorited ? '#ffd21e' : 'white'" stroke-width="2"/>
            </svg>
            <span>{{ formatCount(currentVideo.favorites_count) }}</span>
          </button>

          <button class="action-btn" @click="handleShare">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="white" stroke-width="2"/>
            </svg>
            <span>{{ $t('common.share') }}</span>
          </button>
        </div>

        <!-- CTA按钮 -->
        <ContentCTA v-if="currentVideo" :post="currentVideo" mode="video" />

        <!-- 左下角内容信息 -->
        <div class="video-info">
          <div class="author-name" v-if="currentVideo.author">
            @{{ currentVideo.author.is_official ? $t('common.officialAccount') : currentVideo.author.display_name }}
          </div>
          <h3 class="video-title">{{ getLocalizedTitle(currentVideo) }}</h3>
          <div class="video-description" v-html="sanitizeHtml(getLocalizedContent(currentVideo))"></div>
        </div>
      </div>
    </div>

    <!-- 加载提示 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>

    <!-- 评论抽屉 -->
    <div class="comments-drawer" :class="{ show: showComments }" @click.self="closeComments">
      <div class="drawer-content">
        <div class="drawer-header">
          <h3>{{ $t('postDetail.commentsCount', { count: commentsList.length }) }}</h3>
          <button @click="closeComments" class="close-btn">✕</button>
        </div>
        
        <div class="comments-list" v-if="commentsList.length > 0">
          <div v-for="comment in commentsList" :key="comment.id" class="comment-item">
            <img :src="comment.user.avatar || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg'" class="comment-avatar" />
            <div class="comment-content">
              <div class="comment-user">{{ comment.user.display_name || comment.user.nickname }}</div>
              <div class="comment-text">{{ comment.content }}</div>
              <div class="comment-meta">
                <span class="comment-time">{{ formatCommentTime(comment.created_at) }}</span>
                <span class="comment-location" v-if="comment.user.province">{{ comment.user.province }}</span>
                <button class="meta-btn">{{ $t('postDetail.reply') }}</button>
                <button class="meta-btn">{{ $t('postDetail.translate') }}</button>
              </div>
              
              <!-- 楼中楼回复 -->
              <div class="comment-replies" v-if="comment.replies && comment.replies.length > 0">
                <div v-if="!comment.showReplies" class="expand-replies" @click="comment.showReplies = true">
                  {{ $t('postDetail.expandReplies', { count: comment.replies.length }) }}
                </div>
                <div v-else>
                  <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                    <img :src="reply.user.avatar || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg'" class="reply-avatar" />
                    <div class="reply-content">
                      <div class="reply-user">{{ reply.user.display_name || reply.user.nickname }}</div>
                      <div class="reply-text">{{ reply.content }}</div>
                      <div class="comment-meta">
                        <span class="comment-time">{{ formatCommentTime(reply.created_at) }}</span>
                        <span class="comment-location" v-if="reply.user.province">{{ reply.user.province }}</span>
                        <button class="meta-btn">{{ $t('postDetail.reply') }}</button>
                        <button class="meta-btn">{{ $t('postDetail.translate') }}</button>
                      </div>
                    </div>
                    <button class="like-btn" :class="{ liked: reply.user_liked }">
                      <svg width="20" height="20" viewBox="0 0 24 24" :fill="reply.user_liked ? '#ff2442' : 'none'">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" :stroke="reply.user_liked ? '#ff2442' : '#999'" stroke-width="2"/>
                      </svg>
                      <span v-if="reply.likes_count > 0">{{ reply.likes_count }}</span>
                    </button>
                  </div>
                  <div class="collapse-replies" @click="comment.showReplies = false">
                    {{ $t('postDetail.collapseReplies') }}
                  </div>
                </div>
              </div>
            </div>
            <button class="like-btn" :class="{ liked: comment.user_liked }">
              <svg width="20" height="20" viewBox="0 0 24 24" :fill="comment.user_liked ? '#ff2442' : 'none'">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" :stroke="comment.user_liked ? '#ff2442' : '#999'" stroke-width="2"/>
              </svg>
              <span v-if="comment.likes_count > 0">{{ comment.likes_count }}</span>
            </button>
          </div>
        </div>
        
        <div class="no-comments" v-else>
          {{ $t('postDetail.noComments') }}
        </div>
        
        <!-- 评论输入框 -->
        <div class="comment-input-bar">
          <input 
            v-model="commentText"
            type="text" 
            :placeholder="$t('postDetail.commentInputPlaceholder')" 
            class="comment-input"
            @keyup.enter="submitComment"
          />
          <button class="input-action-btn" @click="toggleEmojiPicker" title="表情">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <circle cx="8" cy="10" r="1.5" fill="currentColor"/>
              <circle cx="16" cy="10" r="1.5" fill="currentColor"/>
              <path d="M8 15c1.5 2 4.5 2 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <input 
            ref="imageInputRef"
            type="file" 
            accept="image/*" 
            style="display: none" 
            @change="handleImageSelect"
          />
          <button class="input-action-btn" @click="triggerImageUpload" title="图片">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button 
            class="send-btn" 
            @click="submitComment"
            :disabled="!commentText.trim()"
          >
            {{ $t('postDetail.sendComment') }}
          </button>
        </div>

        <!-- 表情选择器 -->
        <div v-if="showEmojiPicker" class="emoji-picker">
          <div class="emoji-list">
            <button 
              v-for="emoji in commonEmojis" 
              :key="emoji" 
              @click="insertEmoji(emoji)"
              class="emoji-item"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { useLocalizedContent } from '@/utils/i18n'
import { useAuthStore } from '@/stores/auth'
import { showLoginDialog } from '@/utils/loginDialog'
import axios from 'axios'
import ContentCTA from '@/components/ContentCTA.vue'

const route = useRoute()
const router = useRouter()
const i18n = useI18n()
const { locale, t } = i18n
const { getLocalizedTitle, getLocalizedContent } = useLocalizedContent()
const authStore = useAuthStore()

// 响应式变量
const videoRef = ref(null)
const currentVideo = ref(null)
const videoQueue = ref([]) // 视频队列
const currentIndex = ref(0)
const loading = ref(false)
const isPlaying = ref(false)
const showComments = ref(false)
const commentsList = ref([])
const commentText = ref('')
const showEmojiPicker = ref(false)
const imageInputRef = ref(null)
const isFollowing = ref(false)

// 常用表情符号
const commonEmojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘',
  '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪',
  '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮',
  '😯', '😲', '😳', '🥺', '😢', '😭', '😤', '😠',
  '😡', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡',
  '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
  '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
  '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
  '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤',
  '🤍', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗',
  '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️',
  '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉'
]

// 触摸相关
const touchStartY = ref(0)
const touchMoveY = ref(0)
const isSwiping = ref(false)
const isSwitching = ref(false)

// 播放统计
const playStartTime = ref(0)
const videoDuration = ref(0)

// 辅助函数：确保视频URL是完整URL（生产环境关键修复）
function ensureFullVideoUrl(url) {
  if (!url) return ''
  
  // 如果已经是完整URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // 否则，添加API基础URL
  const baseUrl = import.meta.env.VITE_API_BASE || window.location.origin
  const cleanUrl = url.startsWith('/') ? url : `/${url}`
  return `${baseUrl}${cleanUrl}`
}

// 获取初始视频ID - 支持多种方式：hash、params、query
const initialVideoId = computed(() => {
  // 从 #19 hash获取
  if (window.location.hash) {
    return window.location.hash.replace('#', '')
  }
  // 从 /feed/video/19 params获取
  if (route.params.id) {
    return route.params.id
  }
  // 从 ?id=19 query获取
  if (route.query.id) {
    return route.query.id
  }
  return null
})

// 加载初始视频
async function loadInitialVideo() {
  try {
    loading.value = true
    const response = await axios.get(`/api/posts/${initialVideoId.value}`)
    if (response.data.success) {
      const video = response.data.data
      const rawUrl = video.media_files?.find(f => f.type === 'video')?.url || ''
      video.videoUrl = ensureFullVideoUrl(rawUrl)
      video.user_liked = video.user_liked || false
      video.user_favorited = video.user_favorited || false
      currentVideo.value = video
      videoQueue.value = [video]
      
      // 初始化关注状态
      isFollowing.value = !!video.author?.is_following
      
      // 加载相关视频
      await loadRelatedVideos()
      
      // 等待Vue渲染完成后播放视频
      await nextTick()
      playVideo()
    }
  } catch (error) {
    console.error('加载视频失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载相关视频
async function loadRelatedVideos() {
  try {
    const response = await axios.get(`/api/posts/${currentVideo.value.id}/related-videos`, {
      params: { limit: 5 }
    })
    if (response.data.success) {
      const videos = response.data.data.map(v => {
        const rawUrl = v.media_files?.find(f => f.type === 'video')?.url || ''
        return {
          ...v,
          videoUrl: ensureFullVideoUrl(rawUrl)
        }
      })
      videoQueue.value = [currentVideo.value, ...videos]
    }
  } catch (error) {
    console.error('加载相关视频失败:', error)
  }
}

// 播放视频
function playVideo() {
  if (videoRef.value) {
    videoRef.value.muted = false // 确保视频有声音
    videoRef.value.play().catch(err => {
      console.log('播放失败:', err)
      // 如果有声音播放失败，尝试静音播放
      videoRef.value.muted = true
      videoRef.value.play().catch(err2 => console.log('静音播放也失败:', err2))
    })
    playStartTime.value = Date.now()
    isPlaying.value = true
  }
}

// 暂停视频
function pauseVideo() {
  if (videoRef.value) {
    videoRef.value.pause()
    reportPlayStats()
    isPlaying.value = false
  }
}

// 切换播放/暂停
function togglePlayPause() {
  if (isPlaying.value) {
    pauseVideo()
  } else {
    playVideo()
  }
}

// 触摸开始
function handleTouchStart(e) {
  touchStartY.value = e.touches[0].clientY
  touchMoveY.value = e.touches[0].clientY // 初始化为相同值，避免点击时误判
  isSwiping.value = true
}

// 触摸移动
function handleTouchMove(e) {
  if (!isSwiping.value) return
  
  touchMoveY.value = e.touches[0].clientY
}

// 触摸结束
async function handleTouchEnd() {
  if (!isSwiping.value) return
  
  const diff = touchMoveY.value - touchStartY.value
  const threshold = 80 // 滑动阈值
  const tapThreshold = 10 // 点击阈值（移动距离小于此值视为点击）
  
  // 判断是点击还是滑动
  if (Math.abs(diff) < tapThreshold) {
    // 点击 - 切换播放/暂停
    togglePlayPause()
  } else if (diff > threshold && currentIndex.value > 0) {
    // 向下滑 - 上一个视频
    await switchVideo('prev')
  } else if (diff < -threshold && currentIndex.value < videoQueue.value.length - 1) {
    // 向上滑 - 下一个视频
    await switchVideo('next')
  }
  
  // 重置
  isSwiping.value = false
  touchStartY.value = 0
  touchMoveY.value = 0
}

// 切换视频
async function switchVideo(direction) {
  // 开始切换动画
  isSwitching.value = true
  pauseVideo()
  
  // 短暂延迟让淡出效果显示
  await new Promise(resolve => setTimeout(resolve, 150))
  
  if (direction === 'next') {
    currentIndex.value++
  } else {
    currentIndex.value--
  }
  
  currentVideo.value = videoQueue.value[currentIndex.value]
  
  // 更新关注状态
  isFollowing.value = !!currentVideo.value.author?.is_following
  
  // 如果接近队列末尾，加载更多
  if (currentIndex.value >= videoQueue.value.length - 2) {
    await loadRelatedVideos()
  }
  
  // 等待Vue渲染完成
  await nextTick()
  
  // 结束切换动画
  isSwitching.value = false
  
  // 播放新视频
  playVideo()
}

// 视频元数据加载
function handleLoadedMetadata() {
  if (videoRef.value) {
    videoDuration.value = Math.floor(videoRef.value.duration)
  }
}

// 视频时间更新
function handleTimeUpdate() {
  // 可以在这里实现进度追踪
}

// 视频结束
function handleVideoEnded() {
  reportPlayStats(true)
}

// 上报播放统计
async function reportPlayStats(isCompleted = false) {
  if (!currentVideo.value) return
  
  const playDuration = Math.floor((Date.now() - playStartTime.value) / 1000)
  const completionRate = videoDuration.value > 0 ? (playDuration / videoDuration.value * 100).toFixed(2) : 0
  
  try {
    await axios.post('/api/posts/video-play-stat', {
      post_id: currentVideo.value.id,
      play_duration: playDuration,
      video_duration: videoDuration.value,
      completion_rate: completionRate,
      is_completed: isCompleted,
      source: 'feed'
    })
  } catch (error) {
    console.error('上报播放统计失败:', error)
  }
}

// HTML清洗函数
function sanitizeHtml(html) {
  if (!html) return ''
  
  // 允许的HTML标签
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

// 互动功能
async function toggleLike() {
  if (!currentVideo.value) return
  console.log('👍 点赞按钮被点击，当前状态:', currentVideo.value.user_liked)
  try {
    const headers = authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}
    if (currentVideo.value.user_liked) {
      console.log('🔄 取消点赞请求...')
      await axios.delete(`/api/posts/${currentVideo.value.id}/like`, { headers })
      currentVideo.value.user_liked = false
      currentVideo.value.likes_count--
      console.log('✅ 取消点赞成功')
    } else {
      console.log('🔄 点赞请求...')
      await axios.post(`/api/posts/${currentVideo.value.id}/like`, {}, { headers })
      currentVideo.value.user_liked = true
      currentVideo.value.likes_count++
      console.log('✅ 点赞成功')
    }
  } catch (error) {
    console.error('❌ 点赞失败:', error)
    console.error('错误详情:', error.response?.data)
    // 如果是401未登录错误，显示登录对话框
    if (error.response?.status === 401) {
      showLoginDialog(i18n)
    }
  }
}

async function toggleFavorite() {
  if (!currentVideo.value) return
  console.log('⭐ 收藏按钮被点击，当前状态:', currentVideo.value.user_favorited)
  try {
    const headers = authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}
    if (currentVideo.value.user_favorited) {
      console.log('🔄 取消收藏请求...')
      await axios.delete(`/api/posts/${currentVideo.value.id}/favorite`, { headers })
      currentVideo.value.user_favorited = false
      currentVideo.value.favorites_count--
      console.log('✅ 取消收藏成功')
    } else {
      console.log('🔄 收藏请求...')
      await axios.post(`/api/posts/${currentVideo.value.id}/favorite`, {}, { headers })
      currentVideo.value.user_favorited = true
      currentVideo.value.favorites_count++
      console.log('✅ 收藏成功')
    }
  } catch (error) {
    console.error('❌ 收藏失败:', error)
    console.error('错误详情:', error.response?.data)
    // 如果是401未登录错误，显示登录对话框
    if (error.response?.status === 401) {
      showLoginDialog(i18n)
    }
  }
}

async function handleShare() {
  try {
    const headers = authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}
    await axios.post(`/api/posts/${currentVideo.value.id}/share`, {}, { headers })
    currentVideo.value.shares_count++
    
    if (navigator.share) {
      await navigator.share({
        title: getLocalizedTitle(currentVideo.value),
        url: window.location.href
      })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('链接已复制')
    }
  } catch (error) {
    console.error('分享失败:', error)
  }
}

async function toggleFollow() {
  if (!currentVideo.value?.author) return
  try {
    const headers = authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}
    if (isFollowing.value) {
      await axios.delete(`/api/users/${currentVideo.value.author.id}/follow`, { headers })
      isFollowing.value = false
      currentVideo.value.author.is_following = false
    } else {
      await axios.post(`/api/users/${currentVideo.value.author.id}/follow`, {}, { headers })
      isFollowing.value = true
      currentVideo.value.author.is_following = true
    }
  } catch (error) {
    console.error('关注失败:', error)
  }
}

function openComments() {
  showComments.value = true
  pauseVideo()
}

function closeComments() {
  showComments.value = false
  showEmojiPicker.value = false
  playVideo()
}

// 评论功能
async function submitComment() {
  if (!commentText.value.trim()) return
  
  if (!authStore.isAuthenticated) {
    showLoginDialog(i18n)
    return
  }
  
  try {
    const response = await axios.post(`/api/posts/${currentVideo.value.id}/comments`, {
      content: commentText.value.trim()
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    
    if (response.data.success) {
      commentText.value = ''
      showEmojiPicker.value = false
      // TODO: 刷新评论列表
      showToast({
        message: t('postDetail.commentSuccess') || '评论成功',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('发表评论失败:', error)
    showToast({
      message: t('postDetail.commentFailed') || '评论失败',
      position: 'top'
    })
  }
}

function insertAtSymbol() {
  commentText.value += '@'
}

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
}

function insertEmoji(emoji) {
  commentText.value += emoji
  showEmojiPicker.value = false
}

function triggerImageUpload() {
  if (imageInputRef.value) {
    imageInputRef.value.click()
  }
}

async function handleImageSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  if (!authStore.isAuthenticated) {
    showLoginDialog(i18n)
    return
  }
  
  try {
    const formData = new FormData()
    formData.append('image', file)
    
    // TODO: 实现图片上传API
    const response = await axios.post('/api/upload/comment-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    if (response.data.success) {
      // 将图片URL插入到评论中
      commentText.value += ` [图片:${response.data.url}] `
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    showToast({
      message: '图片上传失败',
      position: 'top'
    })
  } finally {
    // 清空文件输入
    if (imageInputRef.value) {
      imageInputRef.value.value = ''
    }
  }
}

function goBack() {
  router.push('/')
}

function formatCount(count) {
  if (!count || count === 0) return '0'
  if (count >= 10000) return (count / 10000).toFixed(1) + 'w'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return count.toString()
}

function formatCommentTime(timestamp) {
  const now = Date.now()
  const time = new Date(timestamp).getTime()
  const diff = Math.floor((now - time) / 1000)
  
  if (diff < 60) return t('postDetail.justNow')
  if (diff < 3600) return t('postDetail.minutesAgo', { count: Math.floor(diff / 60) })
  if (diff < 86400) return t('postDetail.hoursAgo', { count: Math.floor(diff / 3600) })
  if (diff < 172800) return t('common.yesterday')
  return t('common.daysAgo', { count: Math.floor(diff / 86400) })
}

onMounted(() => {
  loadInitialVideo()
})

onUnmounted(() => {
  pauseVideo()
})
</script>

<style scoped>
.video-feed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  overflow: hidden;
}

.video-container {
  width: 100%;
  height: 100%;
}

.video-item {
  position: relative;
  width: 100%;
  height: 100%;
  opacity: 1;
  transition: opacity 0.2s ease-in-out;
}

.video-item.video-switching {
  opacity: 0;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.back-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
}

.actions {
  position: fixed;
  right: 16px;
  bottom: 150px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  z-index: 50;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
}

.action-btn span {
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}

.author-avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 4px;
}

.avatar-wrapper {
  position: relative;
  width: 48px;
  height: 48px;
}

.action-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  background: white;
}

.follow-btn {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ff2442;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s;
}

.follow-btn:active {
  transform: translateX(-50%) scale(0.9);
}

.video-info {
  position: fixed;
  left: 16px;
  right: 90px;
  bottom: 42px;
  color: white;
  z-index: 20;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.author-name {
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}

.video-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}

.video-description {
  font-size: 14px;
  margin: 0;
  opacity: 0.9;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.comments-drawer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 2000;
}

.comments-drawer.show {
  opacity: 1;
  visibility: visible;
}

.drawer-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70vh;
  background: white;
  border-radius: 20px 20px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.comments-drawer.show .drawer-content {
  transform: translateY(0);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.drawer-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.drawer-header button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.comments-list {
  padding: 20px;
  overflow-y: auto;
  height: calc(100% - 120px);
}

.no-comments {
  padding: 60px 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.comment-item {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  position: relative;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-user {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.comment-text {
  font-size: 15px;
  color: #222;
  line-height: 1.5;
  margin-bottom: 8px;
  word-wrap: break-word;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: #999;
}

.comment-time {
  color: #999;
}

.comment-location {
  color: #999;
}

.meta-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.meta-btn:hover {
  color: #666;
}

.like-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #999;
}

.like-btn.liked {
  color: #ff2442;
}

.like-btn span {
  font-size: 12px;
}

.comment-replies {
  margin-top: 12px;
  padding-left: 0;
}

.expand-replies {
  font-size: 14px;
  color: #0084ff;
  cursor: pointer;
  padding: 8px 0;
}

.collapse-replies {
  font-size: 14px;
  color: #0084ff;
  cursor: pointer;
  padding: 8px 0;
  margin-top: 8px;
}

.reply-item {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  position: relative;
}

.reply-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-user {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.reply-text {
  font-size: 14px;
  color: #222;
  line-height: 1.4;
  margin-bottom: 6px;
  word-wrap: break-word;
}

.comment-input-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #eee;
}

.comment-input {
  flex: 1;
  min-width: 0;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  outline: none;
}

.comment-input:focus {
  border-color: #ff2442;
}

.input-action-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-action-btn:hover {
  color: #ff2442;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
}

.send-btn {
  background: #ff2442;
  color: white;
  border: none;
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 移动端优化：隐藏@按钮，确保发送按钮可见 */
@media (max-width: 400px) {
  .comment-input-bar {
    gap: 6px;
    padding: 10px 12px;
  }
  
  .send-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .input-action-btn {
    padding: 2px;
  }
}

.emoji-picker {
  position: absolute;
  bottom: 70px;
  left: 16px;
  right: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
}

.emoji-list {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.emoji-item {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.emoji-item:hover {
  background: #f5f5f5;
}
</style>
