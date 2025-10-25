/**
 * 全局错误处理工具
 * 提供统一的错误处理、重试机制和用户友好的错误提示
 */

import { showDialog, showFailToast } from 'vant'
import { useI18n } from 'vue-i18n'

// 错误类型定义
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR', 
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
}

// 网络状态检查
export function isOnline() {
  return navigator.onLine
}

// 错误分类器
export function classifyError(error) {
  if (!error) return ERROR_TYPES.UNKNOWN
  
  const message = error.message || error.toString()
  const status = error.status || error.response?.status
  
  // 网络错误
  if (!isOnline() || message.includes('NetworkError') || message.includes('Failed to fetch')) {
    return ERROR_TYPES.NETWORK
  }
  
  // 超时错误
  if (message.includes('timeout') || message.includes('TIMEOUT')) {
    return ERROR_TYPES.TIMEOUT
  }
  
  // HTTP状态码错误
  if (status) {
    if (status === 401 || status === 403) return ERROR_TYPES.AUTH
    if (status === 404) return ERROR_TYPES.NOT_FOUND
    if (status === 422 || status === 400) return ERROR_TYPES.VALIDATION
    if (status >= 500) return ERROR_TYPES.SERVER
  }
  
  // 特定错误信息匹配
  if (message.includes('代理服务器连接失败') || message.includes('connect ECONNREFUSED')) {
    return ERROR_TYPES.NETWORK
  }
  
  return ERROR_TYPES.UNKNOWN
}

// 生产级错误处理器
export class ErrorHandler {
  constructor() {
    this.retryAttempts = new Map()
    this.setupGlobalHandlers()
  }
  
  // 设置全局错误处理
  setupGlobalHandlers() {
    // 全局 Promise 错误捕获
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 未处理的Promise错误:', event.reason)
      this.handleError(event.reason, { 
        context: 'unhandledrejection',
        preventToast: true // 避免过多提示
      })
      event.preventDefault()
    })
    
    // 全局JavaScript错误捕获
    window.addEventListener('error', (event) => {
      console.error('🚨 全局JavaScript错误:', event.error)
      this.handleError(event.error, { 
        context: 'global_error',
        preventToast: true 
      })
    })
  }
  
  // 核心错误处理方法
  async handleError(error, options = {}) {
    const {
      context = 'unknown',
      showToast = true,
      allowRetry = false,
      retryLimit = 3,
      preventToast = false
    } = options
    
    const errorType = classifyError(error)
    const errorKey = `${context}_${Date.now()}`
    
    console.error(`🚨 错误处理 [${errorType}]:`, {
      error,
      context,
      message: error?.message,
      stack: error?.stack
    })
    
    // 记录重试次数
    if (allowRetry) {
      const attempts = this.retryAttempts.get(context) || 0
      this.retryAttempts.set(context, attempts + 1)
      
      if (attempts < retryLimit) {
        console.log(`🔄 准备重试 [${context}] 第${attempts + 1}次...`)
        return { shouldRetry: true, attempt: attempts + 1 }
      }
    }
    
    // 显示用户友好的错误提示
    if (showToast && !preventToast) {
      this.showUserFriendlyError(errorType, error)
    }
    
    // 特殊处理
    switch (errorType) {
      case ERROR_TYPES.AUTH:
        this.handleAuthError(error)
        break
      case ERROR_TYPES.NETWORK:
        this.handleNetworkError(error)
        break
      case ERROR_TYPES.SERVER:
        this.handleServerError(error)
        break
    }
    
    return { shouldRetry: false, errorType }
  }
  
  // 显示用户友好的错误信息
  showUserFriendlyError(errorType, error) {
    const { t } = useI18n()
    
    const messages = {
      [ERROR_TYPES.NETWORK]: '网络连接失败，请检查网络后重试',
      [ERROR_TYPES.AUTH]: '登录已过期，请重新登录',
      [ERROR_TYPES.VALIDATION]: '输入信息有误，请检查后重新提交',
      [ERROR_TYPES.NOT_FOUND]: '请求的内容不存在',
      [ERROR_TYPES.SERVER]: '服务器暂时不可用，请稍后重试',
      [ERROR_TYPES.TIMEOUT]: '请求超时，请重试',
      [ERROR_TYPES.UNKNOWN]: '发生未知错误，请重试'
    }
    
    const message = messages[errorType] || messages[ERROR_TYPES.UNKNOWN]
    showFailToast(message)
  }
  
  // 处理认证错误
  handleAuthError(error) {
    // 清除本地存储的认证信息
    localStorage.removeItem('auth_token')
    sessionStorage.clear()
    
    // 跳转到登录页面
    setTimeout(() => {
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login'
      }
    }, 2000)
  }
  
  // 处理网络错误
  handleNetworkError(error) {
    if (!isOnline()) {
      showDialog({
        title: '网络连接中断',
        message: '请检查网络连接后重试'
      })
    }
  }
  
  // 处理服务器错误
  handleServerError(error) {
    console.error('服务器错误详情:', error)
    
    // 可以在这里添加错误上报逻辑
    // this.reportError(error)
  }
  
  // 清除重试计数
  clearRetryCount(context) {
    this.retryAttempts.delete(context)
  }
  
  // 创建重试装饰器
  createRetryDecorator(retryOptions = {}) {
    const { maxRetries = 3, delay = 1000, backoff = true } = retryOptions
    
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value
      
      descriptor.value = async function(...args) {
        let lastError
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await originalMethod.apply(this, args)
          } catch (error) {
            lastError = error
            
            if (attempt === maxRetries) {
              throw error
            }
            
            const waitTime = backoff ? delay * Math.pow(2, attempt) : delay
            console.log(`重试 ${propertyKey} 第${attempt + 1}次，等待${waitTime}ms...`)
            
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }
        
        throw lastError
      }
    }
  }
}

// 创建全局错误处理器实例
export const errorHandler = new ErrorHandler()

// API请求错误处理装饰器
export function withErrorHandling(fn, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      const result = await errorHandler.handleError(error, {
        context: fn.name || 'api_call',
        allowRetry: true,
        ...options
      })
      
      if (result.shouldRetry) {
        console.log(`🔄 重试API调用: ${fn.name}`)
        return withErrorHandling(fn, { ...options, retryLimit: (options.retryLimit || 3) - 1 })(...args)
      }
      
      throw error
    }
  }
}

// 组件级错误边界HOC
export function withErrorBoundary(component, fallbackComponent) {
  return {
    ...component,
    errorCaptured(err, vm, info) {
      console.error('🚨 组件错误边界捕获:', { err, vm, info })
      errorHandler.handleError(err, { 
        context: `component_${vm.$options.name || 'unknown'}`,
        showToast: false 
      })
      
      // 返回false阻止错误继续传播
      return false
    }
  }
}

// 导出工具函数
export default {
  errorHandler,
  classifyError,
  withErrorHandling,
  withErrorBoundary,
  ERROR_TYPES,
  isOnline
}