import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

// UI组件库 - 使用完整导入避免组件冲突
import Vant, { Toast, Dialog } from 'vant'
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

// 从localStorage读取语言设置，与React应用保持同步
const getSavedLanguage = () => {
  const savedLang = localStorage.getItem('user-language')
  if (savedLang) {
    // 将React应用的语言格式转换为Vue应用的格式
    if (savedLang.includes('en')) return 'en-us'
    if (savedLang.includes('th')) return 'th-th' 
    if (savedLang.includes('zh')) return 'zh-cn'
  }
  return 'zh-cn' // 默认中文
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
  // 监听来自React应用的语言切换事件
  window.addEventListener('languageChanged', (event) => {
    const newLanguage = event.detail.language
    let vueLanguage = 'zh-cn'
    
    if (newLanguage.includes('en')) vueLanguage = 'en-us'
    else if (newLanguage.includes('th')) vueLanguage = 'th-th'
    else if (newLanguage.includes('zh')) vueLanguage = 'zh-cn'
    
    // 更新Vue应用的语言
    i18n.global.locale.value = vueLanguage
    console.log('🌍 Vue应用语言已同步:', vueLanguage)
  })
  
  // 当Vue应用切换语言时，也要通知React应用
  const originalSetLocale = (newLocale) => {
    i18n.global.locale.value = newLocale
    
    // 转换为React应用的格式并保存
    let reactFormat = 'zh-CN'
    if (newLocale === 'en-us') reactFormat = 'en-US'
    else if (newLocale === 'th-th') reactFormat = 'th-TH'
    else if (newLocale === 'zh-cn') reactFormat = 'zh-CN'
    
    localStorage.setItem('user-language', reactFormat)
    
    // 通知React应用
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language: reactFormat } 
    }))
    
    console.log('🌍 语言已切换并同步到React应用:', reactFormat)
  }
  
  // 将切换函数暴露给全局使用
  window.__vueLanguageSwitch__ = originalSetLocale
}

// 初始化语言同步机制
setupLanguageSync()

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 添加路由调试
router.beforeEach((to, from, next) => {
  console.log('BUILD_TAG: ABC123')
  console.log('🚀 路由导航:', {
    到达: to.fullPath,
    路由名称: to.name,
    匹配的路由: to.matched.map(r => r.path),
    查询参数: to.query
  })
  next()
})

// 创建Pinia状态管理
const pinia = createPinia()

// 添加不可删除的构建标记
document.documentElement.setAttribute('data-build', 'ABC123')
window.__BUILD_TAG__ = 'ABC123'

// 创建应用
const app = createApp(App)

// 使用插件
app.use(router)
app.use(pinia)
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

// 全局配置
app.config.globalProperties.$toast = Toast
app.config.globalProperties.$dialog = Dialog

// 挂载应用
app.mount('#app')