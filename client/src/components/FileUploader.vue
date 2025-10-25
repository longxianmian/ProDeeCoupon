<template>
  <div class="file-uploader">
    <div
      class="upload-area"
      :class="{ 'dragover': isDragOver, 'uploading': uploading }"
      @drop="handleDrop"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @click="selectFiles"
    >
      <el-icon class="upload-icon" size="48"><UploadFilled /></el-icon>
      <p class="upload-text">
        {{ uploading ? $t('admin.posts.uploadingText') : $t('admin.posts.uploadAreaText') }}
      </p>
      <p class="upload-tip">{{ $t('admin.posts.uploadTipText') }}</p>
      <p class="upload-note">{{ $t('admin.posts.uploadNoteText') }}</p>
      
      <!-- 上传进度 -->
      <div v-if="uploading" class="upload-progress">
        <el-progress :percentage="uploadProgress" :show-text="false" />
        <span class="progress-text">{{ uploadProgress }}%</span>
      </div>
    </div>

    <!-- 文件列表 - 带预览 -->
    <div v-if="fileList.length > 0" class="file-list">
      <div v-for="(file, index) in fileList" :key="file.id" class="file-item">
        <!-- 文件预览 -->
        <div class="file-preview">
          <!-- 图片预览 -->
          <img 
            v-if="file.type.startsWith('image/')" 
            :src="file.previewUrl" 
            class="preview-image"
            :alt="$t('admin.posts.filePreviewAlt')"
          />
          <!-- 视频预览 -->
          <video 
            v-else-if="file.type.startsWith('video/')" 
            :src="file.previewUrl" 
            class="preview-video"
            controls
            preload="metadata"
          >
            {{ $t('admin.posts.videoNotSupported') }}
          </video>
          <!-- 其他文件类型显示图标 -->
          <div v-else class="preview-icon">
            <el-icon size="40"><Document /></el-icon>
          </div>
        </div>

        <div class="file-info">
          <div class="file-details">
            <span class="file-name" :title="file.name">{{ file.name }}</span>
            <span class="file-size">{{ formatFileSize(file.size) }}</span>
          </div>
          <!-- 状态指示器 -->
          <div class="file-status">
            <div 
              class="status-dot" 
              :class="{
                'pending': !file.uploaded,
                'success': file.uploaded
              }"
              :title="file.uploaded ? $t('admin.posts.uploadSuccess') : $t('admin.posts.pendingUpload')"
            ></div>
          </div>
        </div>
        
        <div class="file-actions">
          <el-button 
            type="danger" 
            size="small" 
            :icon="Delete" 
            circle 
            @click="removeFile(index)"
            :title="$t('admin.posts.deleteFile')"
          />
        </div>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      style="display: none"
      multiple
      :accept="accept"
      @change="handleFileSelect"
    />
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { UploadFilled, Document, Delete } from '@element-plus/icons-vue'

export default {
  name: 'FileUploader',
  components: {
    UploadFilled,
    Document,
    Delete
  },
  props: {
    modelValue: {
      type: Array,
      default: () => []
    },
    accept: {
      type: String,
      default: 'image/*,video/*'
    },
    maxSize: {
      type: Number,
      default: 50 * 1024 * 1024 // 50MB
    },
    maxFiles: {
      type: Number,
      default: 10
    }
  },
  emits: ['update:modelValue', 'upload-success', 'upload-error'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const fileInput = ref(null)
    const isDragOver = ref(false)
    const uploading = ref(false)
    const uploadProgress = ref(0)
    const fileList = ref([])

    // 选择文件
    const selectFiles = () => {
      fileInput.value?.click()
    }

    // 处理文件选择
    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files)
      processFiles(files)
      event.target.value = '' // 清空input
    }

    // 处理拖拽上传
    const handleDrop = (event) => {
      event.preventDefault()
      isDragOver.value = false
      
      const files = Array.from(event.dataTransfer.files)
      processFiles(files)
    }

    // 处理文件
    const processFiles = (files) => {
      // 验证文件数量
      if (fileList.value.length + files.length > props.maxFiles) {
        ElMessage.error(t('admin.posts.maxFilesReached', { max: props.maxFiles }))
        return
      }

      files.forEach(file => {
        // 验证文件大小
        if (file.size > props.maxSize) {
          ElMessage.error(t('admin.posts.fileExceedsSize', { name: file.name }))
          return
        }

        // 验证文件类型
        const isValidType = validateFileType(file)
        if (!isValidType) {
          ElMessage.error(t('admin.posts.fileTypeNotSupported', { name: file.name }))
          return
        }

        // 创建本地预览URL
        const previewUrl = URL.createObjectURL(file)

        // 添加到文件列表
        const fileItem = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          previewUrl: previewUrl, // 本地预览URL
          uploaded: false,
          objectPath: null
        }
        
        fileList.value.push(fileItem)
      })

      emit('update:modelValue', fileList.value)
    }

    // 验证文件类型
    const validateFileType = (file) => {
      if (props.accept === 'image/*,video/*') {
        return file.type.startsWith('image/') || file.type.startsWith('video/')
      }
      if (props.accept === 'image/*') {
        return file.type.startsWith('image/')
      }
      if (props.accept === 'video/*') {
        return file.type.startsWith('video/')
      }
      return true
    }

    // 移除文件
    const removeFile = (index) => {
      const file = fileList.value[index]
      // 释放预览URL，防止内存泄漏
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl)
      }
      fileList.value.splice(index, 1)
      emit('update:modelValue', fileList.value)
    }

    // 上传所有文件
    const uploadFiles = async () => {
      if (fileList.value.length === 0) return []

      uploading.value = true
      uploadProgress.value = 0

      try {
        const uploadResults = []
        const totalFiles = fileList.value.length

        for (let i = 0; i < fileList.value.length; i++) {
          const fileItem = fileList.value[i]
          
          try {
            // 使用FormData直接上传到本地端点
            const formData = new FormData()
            formData.append('file', fileItem.file)
            
            const objectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            const token = localStorage.getItem('admin_token')

            const uploadResponse = await fetch('/api/storage/upload-direct', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-Object-Id': objectId
              },
              body: formData
            })

            if (!uploadResponse.ok) {
              throw new Error(`上传失败: ${uploadResponse.status}`)
            }

            const uploadData = await uploadResponse.json()
            if (!uploadData.success) {
              throw new Error('文件上传失败')
            }

            // 标记文件已上传
            fileItem.uploaded = true
            fileItem.objectPath = uploadData.data.objectPath
            fileItem.url = uploadData.data.url

            uploadResults.push({
              name: fileItem.name,
              type: fileItem.type.startsWith('video/') ? 'video' : 'image',
              size: fileItem.size,
              filename: uploadData.data.filename,
              originalName: fileItem.name,
              url: uploadData.data.url,
              objectPath: uploadData.data.objectPath
            })

            // 更新进度
            uploadProgress.value = Math.round(((i + 1) / totalFiles) * 100)

          } catch (error) {
            console.error(`文件 ${fileItem.name} 上传失败:`, error)
            ElMessage.error(`文件 ${fileItem.name} 上传失败`)
          }
        }

        emit('upload-success', uploadResults)
        return uploadResults

      } catch (error) {
        console.error('上传失败:', error)
        emit('upload-error', error)
        throw error
      } finally {
        uploading.value = false
      }
    }

    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // 清空文件列表
    const clearFiles = () => {
      // 释放所有预览URL
      fileList.value.forEach(file => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl)
        }
      })
      fileList.value = []
      emit('update:modelValue', fileList.value)
    }

    return {
      fileInput,
      isDragOver,
      uploading,
      uploadProgress,
      fileList,
      selectFiles,
      handleFileSelect,
      handleDrop,
      removeFile,
      uploadFiles,
      formatFileSize,
      clearFiles
    }
  }
}
</script>

<style scoped>
.file-uploader {
  width: 100%;
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #fafafa;
}

.upload-area:hover {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.upload-area.dragover {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.upload-area.uploading {
  pointer-events: none;
  opacity: 0.7;
}

.upload-icon {
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: #606266;
  margin: 0 0 8px 0;
}

.upload-tip {
  font-size: 14px;
  color: #909399;
  margin: 0 0 8px 0;
}

.upload-note {
  font-size: 13px;
  color: #67c23a;
  margin: 0;
  font-weight: 500;
}

.upload-progress {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-text {
  font-size: 14px;
  color: #409eff;
  min-width: 40px;
}

.file-list {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.file-item {
  display: flex;
  flex-direction: column;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  background-color: #fff;
  transition: all 0.3s ease;
}

.file-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.file-preview {
  width: 100%;
  height: 180px;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #000;
}

.preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  flex: 1;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: #909399;
}

.file-status {
  margin-left: 12px;
  flex-shrink: 0;
}

.file-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.file-item:hover .file-actions {
  opacity: 1;
}

.file-item {
  position: relative;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.status-dot.pending {
  background-color: #f56c6c;
  box-shadow: 0 0 0 3px rgba(245, 108, 108, 0.2);
  animation: pulse 2s infinite;
}

.status-dot.success {
  background-color: #67c23a;
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(245, 108, 108, 0.1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0);
  }
}
</style>