<template>
  <div class="staff-binding-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <!-- 绑定表单 -->
    <div v-else-if="!bindingComplete" class="binding-form">
      <div class="header">
        <h1>{{ $t('staffBinding.title') }}</h1>
        <p class="subtitle">{{ $t('staffBinding.subtitle') }}</p>
        <div class="store-info" v-if="storeInfo">
          <span class="store-name">{{ storeInfo.name }}</span>
          <span class="store-code">{{ $t('staffBinding.storeCode') }}: {{ storeInfo.code }}</span>
        </div>
      </div>

      <form @submit.prevent="handleBinding" class="binding-form-content">
        <div class="form-group">
          <label for="staffId">{{ $t('staffBinding.staffIdLabel') }}</label>
          <input
            id="staffId"
            v-model="staffId"
            type="text"
            :placeholder="$t('staffBinding.staffIdPlaceholder')"
            required
            class="staff-input"
          />
        </div>

        <div class="line-login-section">
          <p class="line-login-note">{{ $t('staffBinding.lineLoginNote') }}</p>
          <button
            type="button"
            @click="initiateLineLogin"
            class="line-login-button"
            :disabled="!staffId.trim()"
          >
            {{ $t('staffBinding.lineLoginButton') }}
          </button>
        </div>
      </form>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>

    <!-- 绑定成功页面 -->
    <div v-else class="binding-success">
      <div class="success-icon">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="40" fill="#00c851"/>
          <path d="M25 40l12 12 18-18" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2>{{ $t('staffBinding.successTitle') }}</h2>
      <p class="success-message">{{ successMessage }}</p>
      <div class="staff-info" v-if="boundStaffInfo">
        <p><strong>{{ $t('staffBinding.staffName') }}:</strong> {{ boundStaffInfo.name }}</p>
        <p><strong>{{ $t('staffBinding.staffId') }}:</strong> {{ boundStaffInfo.staffId }}</p>
        <p><strong>{{ $t('staffBinding.storeName') }}:</strong> {{ boundStaffInfo.storeName }}</p>
      </div>
      <button @click="closeWindow" class="close-button">
        {{ $t('staffBinding.closeButton') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { adminApi } from '../api/admin'

const { t } = useI18n()
const route = useRoute()

// 响应式数据
const loading = ref(true)
const loadingMessage = ref('')
const staffId = ref('')
const storeCode = ref('')
const storeInfo = ref(null)
const error = ref('')
const bindingComplete = ref(false)
const successMessage = ref('')
const boundStaffInfo = ref(null)

// LINE相关
const liff = ref(null)

// 计算属性
const isInLineApp = computed(() => {
  return window.navigator.userAgent.includes('Line')
})

// 初始化
onMounted(async () => {
  console.log('STAFF_BINDING_BUILD_TAG')
  window.__STAFF_BINDING_BUILD_TAG__ = true
  
  try {
    loadingMessage.value = t('staffBinding.initializing')
    
    // 获取门店编码
    storeCode.value = route.query.store
    if (!storeCode.value) {
      throw new Error('缺少门店参数')
    }

    // 初始化LINE LIFF
    if (window.liff) {
      await initializeLiff()
    } else {
      // 动态加载LIFF SDK
      await loadLiffSdk()
      await initializeLiff()
    }

    loading.value = false
  } catch (error) {
    console.error('初始化失败:', error)
    handleError('初始化失败，请稍后重试')
    loading.value = false
  }
})

// 加载LIFF SDK
async function loadLiffSdk() {
  return new Promise((resolve, reject) => {
    if (window.liff) {
      resolve()
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2.1/sdk.js'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// 初始化LIFF
async function initializeLiff() {
  try {
    const liffId = import.meta.env.VITE_LINE_LIFF_ID
    if (!liffId) {
      throw new Error('LIFF ID未配置')
    }

    await window.liff.init({
      liffId: liffId
    })
    
    liff.value = window.liff

    // 获取门店信息
    await fetchStoreInfo()

    // 如果已经在LINE中登录，自动处理绑定
    if (liff.value.isLoggedIn()) {
      await handleAutoBinding()
    }
  } catch (error) {
    console.error('LIFF初始化失败:', error)
    throw error
  }
}

// 获取门店信息
async function fetchStoreInfo() {
  try {
    // 这里需要一个公开的API来获取门店信息
    // 暂时模拟，实际需要调用后端API
    storeInfo.value = {
      name: '门店名称',
      code: storeCode.value
    }
  } catch (error) {
    console.error('获取门店信息失败:', error)
  }
}

// 发起LINE登录
async function initiateLineLogin() {
  try {
    if (!liff.value) {
      throw new Error('LINE环境未初始化')
    }

    if (!liff.value.isLoggedIn()) {
      liff.value.login()
    } else {
      await processBinding()
    }
  } catch (error) {
    console.error('LINE登录失败:', error)
    handleError('LINE登录失败，请重试')
  }
}

// 自动绑定处理（已登录状态）
async function handleAutoBinding() {
  if (liff.value.isLoggedIn()) {
    // 如果是通过二维码扫描进入且已登录，显示绑定表单
    // 但不自动绑定，需要用户输入工号
    loadingMessage.value = t('staffBinding.loginDetected')
  }
}

// 处理绑定
async function processBinding() {
  try {
    loading.value = true
    loadingMessage.value = t('staffBinding.binding')

    if (!liff.value.isLoggedIn()) {
      throw new Error('请先登录LINE')
    }

    // 获取ID Token
    const idToken = liff.value.getIDToken()
    if (!idToken) {
      throw new Error('无法获取LINE身份信息')
    }

    // 调用绑定API
    const response = await adminApi.verifyStaffBinding({
      staff_id: staffId.value.trim(),
      store_code: storeCode.value,
      id_token: idToken
    })

    if (response.success) {
      // 绑定成功
      bindingComplete.value = true
      successMessage.value = response.message || t('staffBinding.bindingSuccess')
      boundStaffInfo.value = response.data
    } else {
      throw new Error(response.message || '绑定失败')
    }
  } catch (error) {
    console.error('绑定失败:', error)
    handleError(error.message || '绑定失败，请重试')
  } finally {
    loading.value = false
  }
}

// 表单提交处理
async function handleBinding() {
  if (!staffId.value.trim()) {
    handleError('请输入工号')
    return
  }

  await processBinding()
}

// 错误处理
function handleError(message) {
  error.value = message
  setTimeout(() => {
    error.value = ''
  }, 5000)
}

// 关闭窗口
function closeWindow() {
  if (liff.value) {
    liff.value.closeWindow()
  } else {
    window.close()
  }
}
</script>

<style scoped>
.staff-binding-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Arial', sans-serif;
}

.loading-container {
  text-align: center;
  color: white;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.binding-form {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #333;
  margin-bottom: 10px;
  font-size: 24px;
  font-weight: 600;
}

.subtitle {
  color: #666;
  margin-bottom: 20px;
  line-height: 1.5;
}

.store-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.store-name {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.store-code {
  color: #666;
  font-size: 14px;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.staff-input {
  width: 100%;
  padding: 15px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.staff-input:focus {
  outline: none;
  border-color: #667eea;
}

.line-login-section {
  text-align: center;
}

.line-login-note {
  color: #666;
  margin-bottom: 20px;
  font-size: 14px;
  line-height: 1.4;
}

.line-login-button {
  background: #00c851;
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
  width: 100%;
}

.line-login-button:hover:not(:disabled) {
  background: #00a644;
}

.line-login-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  background: #ff6b6b;
  color: white;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  text-align: center;
}

.binding-success {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.success-icon {
  margin-bottom: 20px;
}

.binding-success h2 {
  color: #333;
  margin-bottom: 15px;
  font-size: 24px;
}

.success-message {
  color: #666;
  margin-bottom: 25px;
  font-size: 16px;
  line-height: 1.5;
}

.staff-info {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 25px;
  text-align: left;
}

.staff-info p {
  margin: 8px 0;
  color: #333;
}

.close-button {
  background: #667eea;
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.close-button:hover {
  background: #5a67d8;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .staff-binding-container {
    padding: 10px;
  }
  
  .binding-form,
  .binding-success {
    padding: 30px 20px;
  }
  
  .header h1 {
    font-size: 20px;
  }
}
</style>