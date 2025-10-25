<template>
  <button 
    v-if="showButton" 
    @click="handleLogin" 
    :disabled="loading"
    class="fb-login-btn"
  >
    <svg v-if="!loading" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
    <span v-else class="loading-spinner"></span>
    {{ loading ? $t('common.loading') : buttonText }}
  </button>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  buttonText: {
    type: String,
    default: 'Continue with Facebook'
  }
})

const emit = defineEmits(['success', 'error'])

const showButton = ref(false)
const loading = ref(false)

// 检测是否在 Facebook IAB 环境
function isFacebookIAB() {
  const ua = (navigator.userAgent || '').toLowerCase()
  return ua.includes('fbav') || ua.includes('fban')
}

// 检查功能是否启用
function isFBLoginEnabled() {
  // 从环境变量或全局配置读取
  return import.meta.env.VITE_FB_LOGIN_ENABLED !== 'false'
}

// 懒加载 Facebook SDK
async function ensureFBSDK() {
  if (window.FB) return

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.onload = () => {
      try {
        const appId = import.meta.env.VITE_FB_APP_ID
        if (!appId) {
          throw new Error('VITE_FB_APP_ID not configured')
        }

        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: false,
          version: 'v20.0'
        })
        console.log('✅ Facebook SDK 加载成功')
        resolve()
      } catch (error) {
        console.error('❌ Facebook SDK 初始化失败:', error)
        reject(error)
      }
    }
    script.onerror = () => {
      console.error('❌ Facebook SDK 加载失败')
      reject(new Error('Failed to load Facebook SDK'))
    }
    document.head.appendChild(script)
  })
}

// Facebook 登录处理
async function handleLogin() {
  if (loading.value) return

  loading.value = true
  
  try {
    console.log('🔐 开始 Facebook 登录流程...')
    
    // 确保 SDK 已加载
    await ensureFBSDK()

    // 调用 Facebook 登录
    window.FB.login(async (response) => {
      try {
        if (!response || !response.authResponse) {
          console.warn('⚠️ Facebook 登录取消或失败')
          emit('error', new Error('Login cancelled or failed'))
          return
        }

        console.log('✅ Facebook 登录成功，获取到 authResponse')
        console.log('🔄 发送认证信息到后端...')

        // 将 authResponse 发送到后端
        const res = await fetch('/auth/facebook/callback', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(response.authResponse)
        })

        const data = await res.json()

        if (data && data.ok) {
          console.log('✅ 后端会话建立成功')
          emit('success', data)
          
          // 刷新页面以更新登录状态
          setTimeout(() => {
            location.reload()
          }, 500)
        } else {
          console.error('❌ 后端登录失败:', data)
          emit('error', new Error(data.message || 'Login failed'))
          alert(t('common.loginFailed') || '登录失败，请重试')
        }
      } catch (error) {
        console.error('❌ Facebook 登录回调处理失败:', error)
        emit('error', error)
        alert(t('common.loginFailed') || '登录失败，请重试')
      } finally {
        loading.value = false
      }
    }, { scope: 'public_profile' })
  } catch (error) {
    console.error('❌ Facebook 登录失败:', error)
    emit('error', error)
    alert(t('common.loginFailed') || '登录失败，请重试')
    loading.value = false
  }
}

// 检查是否应该显示按钮
onMounted(() => {
  const isIAB = isFacebookIAB()
  const isEnabled = isFBLoginEnabled()
  
  showButton.value = isIAB && isEnabled
  
  if (isIAB) {
    console.log('✅ 检测到 Facebook IAB 环境，显示 Facebook 登录按钮')
  } else {
    console.log('ℹ️ 非 Facebook IAB 环境，隐藏 Facebook 登录按钮')
  }
})
</script>

<style scoped>
.fb-login-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: #1877F2;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  min-width: 200px;
}

.fb-login-btn:hover:not(:disabled) {
  background: #166FE5;
}

.fb-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
