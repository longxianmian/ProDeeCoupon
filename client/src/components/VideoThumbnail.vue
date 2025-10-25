<template>
  <div class="video-thumb-wrapper">
    <video 
      ref="videoRef"
      :src="videoUrlWithFragment" 
      class="thumb-video"
      preload="metadata"
      muted
      playsinline
    ></video>
    <div class="play-icon">▶</div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'

const props = defineProps({
  videoUrl: {
    type: String,
    required: true
  }
})

// 将相对路径转换为完整URL（生产环境关键修复）
const fullVideoUrl = computed(() => {
  if (!props.videoUrl) return ''
  
  // 如果已经是完整URL，直接使用
  if (props.videoUrl.startsWith('http://') || props.videoUrl.startsWith('https://')) {
    return props.videoUrl
  }
  
  // 如果URL已经以/api开头（绝对路径），直接使用
  if (props.videoUrl.startsWith('/api/') || props.videoUrl.startsWith('/uploads/')) {
    return props.videoUrl
  }
  
  // 其他情况，添加API基础URL
  const baseUrl = import.meta.env.VITE_API_BASE || window.location.origin
  const cleanUrl = props.videoUrl.startsWith('/') ? props.videoUrl : `/${props.videoUrl}`
  return `${baseUrl}${cleanUrl}`
})

// 使用URL片段来指定显示第一帧（0.1秒处）
const videoUrlWithFragment = computed(() => {
  const url = fullVideoUrl.value ? `${fullVideoUrl.value}#t=0.1` : ''
  console.log('📹 VideoThumbnail:', { 
    original: props.videoUrl, 
    fullUrl: fullVideoUrl.value,
    withFragment: url 
  })
  return url
})

onMounted(() => {
  console.log('✅ VideoThumbnail mounted with:', {
    original: props.videoUrl,
    fullUrl: fullVideoUrl.value
  })
})
</script>

<style scoped>
.video-thumb-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.9);
  font-size: 34px;
  pointer-events: none;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}
</style>
