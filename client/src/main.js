import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import axios from 'axios'

// ✅ 全局axios配置：让所有请求自动携带Cookie
axios.defaults.withCredentials = true

// UI组件库 - 使用完整导入避免组件冲突
import Vant from 'vant'
import 'vant/lib/index.css'

// Element Plus UI组件库（管理后台专用）
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'




// 国际化配置
import zhCN from './locales/zh-cn'
import enUS from './locales/en-us'
import thTH from './locales/th-th'

// 路由配置
import routes from './router/index.js'

// 样式
import './assets/styles/main.css'

// LINE LIFF初始化
import { ensureLiff } from './services/auth'

const getSavedLanguage = () => {
  // 检查是否有显式的语言设置标记
  const hasExplicitLanguageSetting = localStorage.getItem('language-explicitly-set')
  
  if (hasExplicitLanguageSetting) {
    const savedLang = localStorage.getItem('user-language')
    if (savedLang) {
      if (savedLang.includes('en')) return 'en-us'
      if (savedLang.includes('th')) return 'th-th' 
      if (savedLang.includes('zh')) return 'zh-cn'
    }
  }
  
  // 首次访问或未明确设置时，强制使用泰文默认
  return 'th-th'
}

// 创建i18n实例
const i18n = createI18n({
  legacy: false,
  locale: getSavedLanguage(),
  fallbackLocale: 'en-us',
  messages: {
    'zh-cn': zhCN,
    'en-us': enUS,
    'th-th': thTH
  }
})

// 实现跨应用语言同步机制
const setupLanguageSync = () => {
  window.addEventListener('languageChanged', (event) => {
    const newLanguage = event.detail.language
    let vueLanguage = 'th-th'
    
    if (newLanguage.includes('en')) vueLanguage = 'en-us'
    else if (newLanguage.includes('th')) vueLanguage = 'th-th'
    else if (newLanguage.includes('zh')) vueLanguage = 'zh-cn'
    
    // 更新Vue应用的语言
    i18n.global.locale.value = vueLanguage
    console.log('🌍 Vue应用语言已同步:', vueLanguage)
  })
  
  const originalSetLocale = (newLocale) => {
    i18n.global.locale.value = newLocale
    
    
    
    window.dispatchEvent(new CustomEvent('languageChanged', { 
    }))
    
  }
  
  // 将切换函数暴露给全局使用
  window.__vueLanguageSwitch__ = originalSetLocale
}

// 初始化语言同步机制
setupLanguageSync()

// ⚠️ 关键：OAuth token必须在UTM清理之前提取！
// LINE浏览器会清除重定向URL中的query参数，但不会清除hash fragment
// 所以我们从 #token=xxx&login=success 提取token
let oauthTokenData = null;
try {
  const currentUrl = window.location.href;
  console.log('🔍 [DEBUG] 当前完整URL:', currentUrl);
  
  // 方法1：从hash fragment提取（LINE浏览器兼容）
  let token = null;
  let loginSuccess = null;
  
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // 去掉开头的#
    token = hashParams.get('token');
    loginSuccess = hashParams.get('login');
    console.log('🔍 [DEBUG] Hash Fragment参数提取:', {
      hasHash: true,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      loginSuccess: loginSuccess,
      allHashParams: Object.fromEntries(hashParams.entries())
    });
  }
  
  // 方法2：备用 - 从query参数提取（普通浏览器）
  if (!token) {
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token');
    loginSuccess = urlParams.get('login');
    console.log('🔍 [DEBUG] Query参数提取:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      loginSuccess: loginSuccess,
      allParams: Object.fromEntries(urlParams.entries())
    });
  }
  
  if (token && loginSuccess === 'success') {
    oauthTokenData = { token, loginSuccess };
    console.log('✅ 提前提取OAuth token（Fragment方式）');
    console.log('🔍 [DEBUG] oauthTokenData已设置:', { hasToken: true, tokenPreview: token.substring(0, 20) + '...' });
  } else {
    console.log('⚠️ [DEBUG] 未检测到完整的登录参数');
  }
} catch (e) {
  console.error('❌ OAuth token预提取失败:', e);
}

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// --- 深链路由 & UTM 首屏解析 ---
import { persistUtmFromUrl } from './utils/utm'
persistUtmFromUrl()

// --- 埋点SDK初始化 ---
import { saveUtmParams, trackPageView } from './services/analytics'
saveUtmParams()

// 提前提取r参数（重定向路径），但不立即跳转
// OAuth登录时会在token保存后跳转，非OAuth时在路由ready后跳转
let redirectPath = null;
try{
  const url = new URL(window.location.href)
  const r = url.searchParams.get('r')
  const lang = url.searchParams.get('lang')
  const province = url.searchParams.get('province')
  if (lang){
    // 兼容你的语言同步机制
    const map = { 'en-us':'en-US', 'th-th':'th-TH', 'zh-cn':'zh-CN' }
  }
  if (province){ localStorage.setItem('province', province); window.dispatchEvent(new CustomEvent('provinceChanged', { detail: { province } })) }
  if (r){ 
    redirectPath = r;
    console.log('✅ 提取重定向路径:', redirectPath);
  }
}catch{}

// 添加路由守卫和调试
router.beforeEach(async (to, from, next) => {
  console.log('🚀 路由导航:', {
    到达: to.fullPath,
    路由名称: to.name,
    匹配的路由: to.matched.map(r => r.path),
    查询参数: to.query
  })
  
  // 检查需要认证的管理员路由
  if (to.matched.some(record => record.meta.requiresAuth)) {
    const adminToken = localStorage.getItem('admin_token')
    if (!adminToken) {
      console.log('🔒 未登录，跳转到登录页')
      
      // 检查是否是从管理页面跳转（说明token过期）
      if (from.path && from.path.startsWith('/admin') && from.path !== '/admin/login') {
        // 导入ElMessage动态提示
        import('element-plus').then(({ ElMessage }) => {
          ElMessage.warning('登录已过期，请重新登录')
        })
      }
      
      next('/admin/login')
      return
    }
  }
  
  // 检查需要店员权限的路由
  if (to.matched.some(record => record.meta.requiresStaff)) {
    try {
      // 动态导入避免循环依赖
      const { useAuthStore } = await import('./stores/auth.js')
      const authStore = useAuthStore()
      
      // 刷新店员状态
      await authStore.refresh()
      
      if (!authStore.isStaff) {
        console.log('🔒 非店员用户，跳转到首页')
        next('/')
        return
      }
    } catch (error) {
      console.error('店员权限检查失败:', error)
      next('/')
      return
    }
  }
  
  next()
})

// 添加页面访问埋点
router.afterEach(async (to) => {
  // 页面访问埋点
  trackPageView(to.path)
  
  // ⚠️ 关键：检测 ?login=ok 参数并刷新登录态
  if (to.query.login === 'ok') {
    console.log('🎉 [LOGIN] 检测到登录成功回调 (?login=ok)');
    
    try {
      // 刷新用户状态
      const { fetchMe } = await import('./services/user')
      await fetchMe()
      console.log('✅ [LOGIN] 用户状态已刷新');
      
      // 清除 login 参数，避免重复触发
      const { fullPath, path, query, hash } = to
      const { login, ...rest } = query
      router.replace({ path, query: rest, hash })
      console.log('🔄 [LOGIN] 已清理 URL 参数');
    } catch (error) {
      console.error('❌ [LOGIN] 刷新用户状态失败:', error);
    }
  }
})

// 创建Pinia状态管理
const pinia = createPinia()

// 创建应用
const app = createApp(App)

// 使用插件 - 注意顺序：Pinia必须在router之前，因为路由守卫中使用了store
app.use(pinia)
app.use(router)
app.use(i18n)

// 注册UI组件库
// Vant组件（用户端H5）- 使用完整导入
app.use(Vant)

// Element Plus组件（管理后台PC端）
app.use(ElementPlus)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局配置（Vant 4.x不再需要注册Toast/Dialog到全局）

// 挂载应用
app.mount('#app')

// OAuth登录token处理（三重保险机制：localStorage → Cookie → URL Token）
const handleOAuthToken = async () => {
  try {
    // 检查是否是登录回调（有token或login参数）
    const urlParams = new URLSearchParams(window.location.search);
    const loginSuccess = urlParams.get('login');
    
    if (oauthTokenData || loginSuccess === 'success') {
      console.log('🔐 检测到登录回调，启动三重验证...');
      
      // 方法1：优先尝试Cookie方式（安全，防XSS）
      try {
        console.log('🍪 [方式1] 尝试Cookie登录...');
        const { fetchMe } = await import('./services/user')
        await fetchMe()
        console.log('✅ Cookie登录成功！用户状态已更新');
        
        // 清理URL hash fragment（保留路由hash）
        const cleanUrl = window.location.pathname + window.location.search
        window.history.replaceState({}, document.title, cleanUrl)
        return; // Cookie成功，直接返回
      } catch (cookieError) {
        console.warn('⚠️ Cookie登录失败，尝试备用方案...', cookieError);
      }
      
      // 方法2：备用方案 - 使用URL token参数（兼容性好）
      if (oauthTokenData) {
        const { token } = oauthTokenData;
        console.log('🔑 [方式2] 使用URL Token备用方案...');
        
        // 保存token到localStorage
        localStorage.setItem('user_token', token);
        
        // 刷新用户信息
        const { fetchMe } = await import('./services/user')
        await fetchMe()
        console.log('✅ Token登录成功！用户状态已更新');
        
        // 清理URL hash fragment（保留query参数）
        const cleanUrl = window.location.pathname + window.location.search
        window.history.replaceState({}, document.title, cleanUrl)
        return;
      }
      
      console.error('❌ Cookie和URL Token都失败了');
      return;
    }
    
    // 非登录回调，检查localStorage中是否有token
    console.log('🔍 OAuth Token检查: 未检测到URL中的token');
    const existingToken = localStorage.getItem('user_token');
    if (existingToken) {
      console.log('🔑 [方式3] 检测到localStorage中的token，验证并加载用户信息...');
      try {
        const { fetchMe } = await import('./services/user')
        await fetchMe()
        console.log('✅ 用户信息已加载（来自localStorage）');
        return;
      } catch (error) {
        console.error('❌ LocalStorage Token验证失败，清除无效token:', error);
        localStorage.removeItem('user_token');
      }
    }
    
    // 检查是否有重定向路径
    if (redirectPath) {
      console.log('🔄 执行普通重定向:', redirectPath);
      router.replace(redirectPath);
    }
  } catch (error) {
    console.error('❌ OAuth token处理失败:', error)
  }
}

// 等待路由ready后再处理OAuth token
router.isReady().then(() => {
  handleOAuthToken()
})

// 检测当前环境
function isProductionEnvironment() {
  const hostname = window.location.hostname
  const href = window.location.href
  console.log(`🔍 [环境检测] hostname="${hostname}", href="${href}"`)
  
  // 检查是否强制启用LIFF（用于开发环境测试）
  const forceLiff = import.meta.env.VITE_FORCE_LIFF_LOGIN === 'true'
  if (forceLiff) {
    console.log(`🔧 [环境检测] 强制启用LIFF模式（VITE_FORCE_LIFF_LOGIN=true）`)
    return true
  }
  
  const isProd = hostname === 'prodee.replit.app' || hostname.endsWith('.prodee.replit.app')
  console.log(`🔍 [环境检测] 判断结果: ${isProd ? '生产环境' : '开发环境'}`)
  return isProd
}

// 初始化LIFF SDK（仅在生产环境）
const initLiffSDK = async () => {
  try {
    // 🔍 强制打印关键环境 & LIFF 状态
    console.log('[CHECK] host=', location.host, 'path=', location.pathname);
    console.log('[CHECK] href=', location.href);
    console.log('[CHECK] VITE_LINE_LIFF_ID=', (import.meta.env.VITE_LINE_LIFF_ID||'').slice(0,10)+'...');
    console.log('[CHECK] VITE_LIFF_ID=', (import.meta.env.VITE_LIFF_ID||'').slice(0,10)+'...');
    
    // 后台管理页面不需要 LIFF，跳过初始化
    const currentPath = window.location.pathname
    if (currentPath.startsWith('/admin')) {
      console.log('ℹ️ 后台管理页面，跳过 LIFF SDK 初始化')
      console.warn('⚠️ /admin路径不会触发LIFF登录，如需登录请访问前台页面')
      return
    }
    
    const liffId = import.meta.env.VITE_LINE_LIFF_ID || import.meta.env.VITE_LIFF_ID
    console.log('🔍 LIFF ID检查:', liffId ? '已配置' : '未配置')
    
    if (!liffId) {
      console.log('ℹ️ 无LIFF ID配置，跳过LINE登录初始化')
      return
    }
    
    // 检测环境
    const isProd = isProductionEnvironment()
    console.log(`🌍 当前环境: ${isProd ? '生产环境' : '开发环境'}`)
    
    if (!isProd) {
      console.log('ℹ️ 开发环境，使用PKCE登录（不需要LIFF）')
      return
    }
    
    // 生产环境：使用LIFF登录
    console.log('🚀 初始化LIFF SDK（生产环境）...')
    await ensureLiff()
    
    // 🔍 打印LIFF状态
    console.log('[CHECK] isInClient=', window.liff?.isInClient?.());
    console.log('[CHECK] _isInitialized=', window.liff?._isInitialized, 'isReady=', window.liff?.isReady);
    console.log('✅ LIFF SDK初始化成功')
    
    // ⚠️ 修复：不再自动登录，只验证现有会话
    // 旧逻辑会导致"退出后立即又登录"问题
    if (window.liff && window.liff.isLoggedIn()) {
      console.log('🔑 检测到LIFF已登录状态（但不自动交换token）')
      
      // 只检查后端会话是否有效，不主动交换token
      try {
        const res = await fetch('/api/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          console.log('🔍 [LIFF初始化] /api/me 响应:', data)
          
          // 修复：正确检查响应格式 { success: true, data: { id, line_id, ... } }
          if (data.success && data.data && (data.data.id || data.data.line_id)) {
            console.log('✅ 后端会话有效，用户已登录:', data.data.nickname || data.data.name)
            // 刷新状态但不执行任何登录操作
            const authStore = useAuthStore()
            authStore.me = data.data
            console.log('✅ authStore已更新，isAuthenticated:', authStore.isAuthenticated)
          } else {
            console.log('ℹ️ 后端会话无效（未登录或匿名用户），等待用户主动登录')
          }
        }
      } catch (error) {
        console.log('ℹ️ 无后端会话，等待用户主动登录')
      }
    } else {
      console.log('ℹ️ LIFF未登录，等待用户主动登录')
    }
    
    console.log('💡 用户可以点击"登录"按钮来主动触发授权')
    
    // 处理 liff.state 参数路由（LIFF登录后的深度链接）
    try {
      const params = new URLSearchParams(location.search)
      const state = params.get('liff.state')
      
      if (state) {
        console.log('🔗 检测到 liff.state 参数:', state)
        // 清理路径格式
        const targetPath = state.startsWith('/') ? state : `/${state}`
        console.log('🚀 执行 liff.state 路由跳转:', targetPath)
        
        // 使用 router 跳转到目标页面
        router.replace(targetPath)
        
        // 清理URL中的 liff.state 参数
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, document.title, cleanUrl)
      }
    } catch (stateError) {
      console.warn('⚠️ liff.state 路由处理失败:', stateError)
    }
  } catch (error) {
    console.error('⚠️ LIFF SDK初始化失败:', error)
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    // 初始化失败不是致命错误，系统仍可正常使用
  }
}

// 调试代码已移除

// 应用挂载完成后隐藏loading页面和初始化LIFF
setTimeout(async () => {
  document.body.classList.add('app-ready')
  
  // 异步初始化LIFF SDK（后台页面会自动跳过）
  initLiffSDK()
  
  // 完全移除loading元素
  setTimeout(() => {
    const loadingEl = document.querySelector('.loading')
    if (loadingEl) loadingEl.remove()
  }, 300)
}, 100)

// —— 一次性全局兜底解锁（捕获首次用户点击）——
import { useAudioUnlock } from './composables/useAudioUnlock'
;(() => {
  try {
    const { unlockAudio } = useAudioUnlock()
    const handler = async () => {
      await unlockAudio()
      window.removeEventListener('pointerdown', handler, { capture: true })
    }
    window.addEventListener('pointerdown', handler, { capture: true, once: true })
  } catch (e) {}
})()