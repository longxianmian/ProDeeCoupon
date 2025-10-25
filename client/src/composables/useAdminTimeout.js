import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

/**
 * 管理员自动登出功能
 * 30分钟无活动自动登出并清除认证信息
 * 符合安全最佳实践
 */
export function useAdminTimeout() {
  const router = useRouter()
  const timeoutId = ref(null)
  const warningTimeoutId = ref(null)
  const isActive = ref(true)
  
  // 超时时间：30分钟（安全策略）
  const TIMEOUT_DURATION = 30 * 60 * 1000 // 30分钟
  const WARNING_DURATION = (30 * 60 - 10) * 1000 // 29分50秒时显示警告
  
  // 用户活动事件类型
  const ACTIVITY_EVENTS = [
    'mousedown', 'mousemove', 'keypress', 'scroll', 
    'touchstart', 'touchmove', 'click', 'keydown'
  ]
  
  // 清除管理员认证信息并跳转登录页
  const logout = () => {
    console.log('🔒 管理员会话超时，自动登出')
    
    // 清除本地存储
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    
    // 清除所有定时器
    clearTimeout(timeoutId.value)
    clearTimeout(warningTimeoutId.value)
    
    // 跳转到登录页
    router.replace('/admin/login')
  }
  
  // 显示警告提示
  const showWarning = () => {
    console.log('⚠️ 管理员会话即将超时（10秒后自动登出）')
    
    // 这里可以显示一个警告对话框或Toast
    // 使用动态导入避免循环依赖
    import('element-plus').then(({ ElMessage }) => {
      ElMessage.warning({
        message: '会话即将在10秒后超时，请移动鼠标继续使用',
        duration: 5000,
        showClose: true
      })
    }).catch(() => {
      // 如果Element Plus不可用，使用原生alert
      console.warn('会话即将在10秒后超时，请移动鼠标继续使用')
    })
  }
  
  // 重置超时计时器
  const resetTimeout = () => {
    // 清除现有计时器
    clearTimeout(timeoutId.value)
    clearTimeout(warningTimeoutId.value)
    
    // 检查是否还有有效的admin token
    const adminToken = localStorage.getItem('admin_token')
    if (!adminToken) {
      return // 没有token就不设置计时器
    }
    
    // 设置警告计时器（9分40秒）
    warningTimeoutId.value = setTimeout(showWarning, WARNING_DURATION)
    
    // 设置超时计时器（10分钟）
    timeoutId.value = setTimeout(logout, TIMEOUT_DURATION)
  }
  
  // 用户活动事件处理器
  const handleActivity = () => {
    if (isActive.value) {
      resetTimeout()
    }
  }
  
  // 启动活动监测
  const startMonitoring = () => {
    // 检查是否在管理员页面
    const currentPath = router.currentRoute.value.path
    if (!currentPath.startsWith('/admin/') || currentPath === '/admin/login') {
      return // 非管理员页面或登录页不监测
    }
    
    // 检查是否有admin token
    const adminToken = localStorage.getItem('admin_token')
    if (!adminToken) {
      return // 没有token不监测
    }
    
    console.log('🕰️ 启动管理员会话超时监测（30分钟无活动自动登出）')
    
    isActive.value = true
    
    // 添加活动事件监听器
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })
    
    // 初始化计时器
    resetTimeout()
  }
  
  // 停止活动监测
  const stopMonitoring = () => {
    console.log('🛑 停止管理员会话超时监测')
    
    isActive.value = false
    
    // 移除事件监听器
    ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, handleActivity)
    })
    
    // 清除计时器
    clearTimeout(timeoutId.value)
    clearTimeout(warningTimeoutId.value)
  }
  
  // 手动触发登出
  const manualLogout = () => {
    stopMonitoring()
    logout()
  }
  
  // 组件生命周期钩子
  onMounted(() => {
    startMonitoring()
  })
  
  onUnmounted(() => {
    stopMonitoring()
  })
  
  return {
    startMonitoring,
    stopMonitoring,
    resetTimeout,
    manualLogout,
    isActive
  }
}