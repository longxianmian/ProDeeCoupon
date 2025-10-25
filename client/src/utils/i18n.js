/**
 * 全局多语言辅助函数
 * 用于统一处理动态内容的多语言显示
 */

import { useI18n } from 'vue-i18n'

/**
 * 标准化locale处理，解决不一致问题
 * @param {string} locale - 当前语言设置
 * @returns {string} 标准化的语言代码
 */
export function normalizeLocale(locale) {
  const lang = (locale || '').toLowerCase().replace('_', '-')
  if (lang.startsWith('en')) return 'en-us'
  if (lang.startsWith('th')) return 'th-th'
  if (lang.startsWith('zh')) return 'zh-cn'
  return 'th-th' // 默认泰文
}

/**
 * 获取本地化标题
 * @param {Object} item - 包含多语言字段的对象
 * @param {string} locale - 当前语言设置
 * @returns {string} 本地化的标题
 */
export function getLocalizedTitle(item, locale) {
  if (!item) return ''
  
  const currentLang = normalizeLocale(locale)
  switch(currentLang) {
    case 'en-us':
      // 优先英文，没有英文则fallback到泰文，最后fallback到基础title
      return item.title_en_us || item.title_th_th || item.title || ''
    case 'zh-cn':
      // 优先中文，没有中文则fallback到泰文，最后fallback到基础title
      return item.title_zh_cn || item.title_th_th || item.title || ''
    default: // 'th-th'
      return item.title_th_th || item.title_en_us || item.title || ''
  }
}

/**
 * 获取本地化描述
 * @param {Object} item - 包含多语言字段的对象
 * @param {string} locale - 当前语言设置
 * @returns {string} 本地化的描述
 */
export function getLocalizedDescription(item, locale) {
  if (!item) return ''
  
  const currentLang = normalizeLocale(locale)
  switch(currentLang) {
    case 'en-us':
      // 优先英文，没有英文则fallback到泰文，最后fallback到基础description
      return item.description_en_us || item.description_th_th || item.description || ''
    case 'zh-cn':
      // 优先中文，没有中文则fallback到泰文，最后fallback到基础description
      return item.description_zh_cn || item.description_th_th || item.description || ''
    default: // 'th-th'
      return item.description_th_th || item.description_en_us || item.description || ''
  }
}

/**
 * 获取本地化内容（用于posts表的content字段）
 * @param {Object} item - 包含多语言字段的对象
 * @param {string} locale - 当前语言设置
 * @returns {string} 本地化的内容
 */
export function getLocalizedContent(item, locale) {
  if (!item) return ''
  
  const currentLang = normalizeLocale(locale)
  switch(currentLang) {
    case 'en-us':
      // 优先英文，没有英文则fallback到泰文，最后fallback到基础content
      return item.content_en_us || item.content_th_th || item.content || ''
    case 'zh-cn':
      // 优先中文，没有中文则fallback到泰文，最后fallback到基础content
      return item.content_zh_cn || item.content_th_th || item.content || ''
    default: // 'th-th'
      return item.content_th_th || item.content_en_us || item.content || ''
  }
}

/**
 * 获取本地化门店名称
 * @param {Object} store - 门店对象
 * @param {string} locale - 当前语言设置
 * @returns {string} 本地化的门店名称
 */
export function getLocalizedStoreName(store, locale) {
  if (!store) return ''
  
  const currentLang = normalizeLocale(locale)
  switch(currentLang) {
    case 'en-us':
      return store.name_en_us || store.name_th_th || store.name || ''
    case 'zh-cn':
      return store.name_zh_cn || store.name_th_th || store.name || ''
    default: // 'th-th'
      return store.name_th_th || store.name_en_us || store.name || ''
  }
}

/**
 * Vue组合式API钩子：用于在组件中使用多语言功能
 */
export function useLocalizedContent() {
  const { locale } = useI18n()
  
  return {
    /**
     * 获取本地化标题（响应式）
     */
    getLocalizedTitle: (item) => getLocalizedTitle(item, locale.value),
    
    /**
     * 获取本地化描述（响应式）
     */
    getLocalizedDescription: (item) => getLocalizedDescription(item, locale.value),
    
    /**
     * 获取本地化内容（响应式，用于posts表的content字段）
     */
    getLocalizedContent: (item) => getLocalizedContent(item, locale.value),
    
    /**
     * 获取本地化门店名称（响应式）
     */
    getLocalizedStoreName: (store) => getLocalizedStoreName(store, locale.value),
    
    /**
     * 当前语言代码
     */
    currentLocale: () => normalizeLocale(locale.value)
  }
}

/**
 * 检查是否有任何多语言内容
 * @param {Object} item - 要检查的对象
 * @returns {boolean} 是否有多语言内容
 */
export function hasMultilingualContent(item) {
  if (!item) return false
  
  return !!(
    item.title_zh_cn || item.title_en_us || item.title_th_th ||
    item.description_zh_cn || item.description_en_us || item.description_th_th
  )
}

/**
 * 获取缺失的多语言字段
 * @param {Object} item - 要检查的对象
 * @returns {Array} 缺失的字段列表
 */
export function getMissingMultilingualFields(item) {
  if (!item) return []
  
  const missing = []
  const fields = [
    { key: 'title_zh_cn', name: '中文标题' },
    { key: 'title_en_us', name: '英文标题' },
    { key: 'title_th_th', name: '泰文标题' },
    { key: 'description_zh_cn', name: '中文描述' },
    { key: 'description_en_us', name: '英文描述' },
    { key: 'description_th_th', name: '泰文描述' }
  ]
  
  fields.forEach(field => {
    if (!item[field.key] || item[field.key].trim() === '') {
      missing.push(field)
    }
  })
  
  return missing
}