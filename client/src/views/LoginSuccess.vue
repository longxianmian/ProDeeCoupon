<template>
  <div class="login-success-page">
    <div class="success-container">
      <div v-if="status === 'loading'" class="loading-state">
        <van-loading size="48px" color="#06C755">正在完成登录...</van-loading>
        <p class="status-text">{{ statusText }}</p>
      </div>
      
      <div v-else-if="status === 'success'" class="success-state">
        <van-icon name="success" color="#06C755" size="64px" />
        <h2>登录成功！</h2>
        <p>正在跳转...</p>
      </div>
      
      <div v-else-if="status === 'error'" class="error-state">
        <van-icon name="warning-o" color="#ee0a24" size="64px" />
        <h2>登录失败</h2>
        <p>{{ errorMessage }}</p>
        <van-button type="primary" @click="retry">重试</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ensureLiff } from '../services/auth'
import { exchangeTokenAndStore } from '../services/auth'
import { fetchMe } from '../services/user'

const router = useRouter()
const status = ref('loading')
const statusText = ref('初始化LINE环境...')
const errorMessage = ref('')

onMounted(async () => {
  try {
    // 1. 初始化LIFF
    statusText.value = '初始化LINE环境...'
    await ensureLiff()
    
    if (!window.liff || !window.liff.isLoggedIn()) {
      throw new Error('LIFF未登录，请重新登录')
    }
    
    // 2. 获取LIFF ID Token并交换为JWT
    statusText.value = '获取登录凭证...'
    const jwtToken = await exchangeTokenAndStore()
    
    if (!jwtToken) {
      throw new Error('获取登录凭证失败')
    }
    
    // 3. 刷新用户状态
    statusText.value = '加载用户信息...'
    await fetchMe()
    
    // 4. 登录成功
    status.value = 'success'
    statusText.value = '登录成功！'
    
    // 5. 延迟跳转到首页
    setTimeout(() => {
      router.push('/')
    }, 1000)
    
  } catch (error) {
    console.error('登录失败:', error)
    status.value = 'error'
    errorMessage.value = error.message || '未知错误'
  }
})

const retry = () => {
  window.location.href = '/auth/line/start'
}
</script>

<style scoped>
.login-success-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.success-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
}

.loading-state, .success-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.status-text {
  color: #999;
  font-size: 14px;
}
</style>
