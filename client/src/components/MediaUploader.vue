<template>
  <div class="media-uploader">
    <el-upload
      class="uploader"
      :action="action"
      :data="extraData"
      :headers="headers"
      :multiple="true"
      :limit="mode === 'image' ? maxImages : maxVideos"
      :file-list="fileList"
      list-type="picture-card"
      :before-upload="beforeUpload"
      :on-success="onSuccess"
      :on-error="onError"
      :on-remove="onRemove"
      accept="image/*,video/*"
      name="files"
    >
      <el-icon><Plus /></el-icon>
      <template #tip>
        <div class="el-upload__tip">
          规则：<b>图片最多 {{maxImages}} 张</b> 或 <b>视频最多 {{maxVideos}} 个</b>，
          <span v-if="mode==='image'">当前模式：图片</span>
          <span v-else-if="mode==='video'">当前模式：视频</span>
          <span v-else>尚未选择，首次文件将决定模式</span>
        </div>
      </template>

      <template #file="{ file }">
        <div class="thumb">
          <img v-if="isImage(file)" :src="file.url" />
          <video v-else :src="file.url" preload="metadata" muted playsinline />
          <div class="mask" v-if="file.status !== 'success'">{{ file.status?.toUpperCase() }}</div>
        </div>
      </template>
    </el-upload>

    <div v-if="mode" class="mode-tip">
      <el-tag type="info" closable @close="resetMode">
        已锁定为「{{ mode==='image' ? '图片' : '视频' }}」模式，若要改，请清空已上传文件。
      </el-tag>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  action: { type: String, required: true },
  baseUrl: { type: String, default: '' },
  headers: { type: Object, default: () => ({}) },
  extraData: { type: Object, default: () => ({}) },
  modelValue: { type: Array, default: () => [] },
  maxImages: { type: Number, default: 3 },
  maxVideos: { type: Number, default: 1 },
})

const emit = defineEmits(['update:modelValue','change'])

const fileList = ref([])
const mode = ref(null)

watch(() => props.modelValue, (val) => {
  fileList.value = (val || []).map((m, i) => ({
    uid: `${i}`,
    name: m.url?.split('/').pop() || `media-${i}`,
    status: 'success',
    url: m.url,
    raw: { type: m.type === 'video' ? 'video/*' : 'image/*' }
  }))
  if ((val || []).length) mode.value = (val[0].type === 'video') ? 'video' : 'image'
  else mode.value = null
}, { immediate: true })

const isImage = (f) => {
  const t = f?.raw?.type || f?.type
  if (!t && f?.url) return !/\.mp4|\.mov|\.webm|\.m4v/i.test(f.url)
  return /^image\//i.test(t)
}
const isVideo = (f) => !isImage(f)

const toUrl = (u) => {
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  return props.baseUrl ? `${props.baseUrl.replace(/\/$/,'')}${u.startsWith('/')?'':'/'}${u}` : u
}

const resetMode = () => {
  fileList.value = []
  mode.value = null
  emit('update:modelValue', [])
  emit('change', [])
}

const beforeUpload = (raw) => {
  const isImg = /^image\//.test(raw.type)
  const isVid = /^video\//.test(raw.type)

  if (!isImg && !isVid) { ElMessage.error('仅支持图片或视频'); return false }

  if (!mode.value) mode.value = isImg ? 'image' : 'video'
  if (mode.value === 'image' && !isImg) { ElMessage.error('已选图片模式，不能再上传视频'); return false }
  if (mode.value === 'video' && !isVid) { ElMessage.error('已选视频模式，不能再上传图片'); return false }

  const imgCount = fileList.value.filter(isImage).length
  const vidCount = fileList.value.filter(isVideo).length
  if (isImg && imgCount >= props.maxImages) { ElMessage.error(`最多 ${props.maxImages} 张图片`); return false }
  if (isVid && vidCount >= props.maxVideos) { ElMessage.error(`最多 ${props.maxVideos} 个视频`); return false }

  return true
}

const onSuccess = (resp, file, list) => {
  // 支持多种响应格式：resp.data.files[0].url, resp.data.url, resp.url
  let url = ''
  if (resp?.data?.files && Array.isArray(resp.data.files) && resp.data.files.length > 0) {
    url = resp.data.files[0].url
  } else {
    url = resp?.data?.url || resp?.url || file?.response?.url || ''
  }
  
  file.url = toUrl(url)
  file.status = 'success'
  
  // 关键：更新受控的 fileList，否则 UI 不会刷新
  fileList.value = [...list]
  
  const out = list
    .filter(f => f.status==='success' && f.url)
    .map(f => ({ type: isImage(f) ? 'image' : 'video', url: f.url }))
  emit('update:modelValue', out)
  emit('change', out)
  
  ElMessage.success('上传成功')
  console.log('✅ 上传成功 ->', file.url)
}

const onError = (err) => { console.error(err); ElMessage.error('上传失败') }

const onRemove = (file, list) => {
  const out = list
    .filter(f => f.status==='success' && f.url)
    .map(f => ({ type: isImage(f) ? 'image' : 'video', url: f.url }))
  emit('update:modelValue', out)
  emit('change', out)
  if (out.length === 0) mode.value = null
}
</script>

<style scoped>
.media-uploader :deep(.el-upload-list__item){ border-radius:8px; overflow:hidden; }
.thumb{ position:relative; width:100%; height:100%; }
.thumb img,.thumb video{ width:100%; height:100%; object-fit:cover; display:block; }
.mask{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
       background:rgba(0,0,0,.4); color:#fff; font-size:12px; }
.mode-tip{ margin-top:8px; }
</style>
