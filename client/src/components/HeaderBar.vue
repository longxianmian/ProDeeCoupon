<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['menu'])
const { locale, t } = useI18n()
const showLangPicker = ref(false)

const languages = [
  { code: 'zh-cn', label: '中文', flag: '🇨🇳' },
  { code: 'en-us', label: 'English', flag: '🇬🇧' },
  { code: 'th-th', label: 'ไทย', flag: '🇹🇭' }
]

const currentLang = () => languages.find(l => l.code === locale.value) || languages[0]

function toggleLangPicker() {
  console.log('🌍 [语言切换] 点击国旗按钮，当前状态:', showLangPicker.value)
  showLangPicker.value = !showLangPicker.value
  console.log('🌍 [语言切换] 新状态:', showLangPicker.value)
}

function changeLang(code) {
  console.log('🌍 [语言切换] 选择语言:', code, '当前语言:', locale.value)
  locale.value = code
  // 保存到localStorage
  localStorage.setItem('user-language', code)
  // 标记用户已明确设置语言
  localStorage.setItem('language-explicitly-set', 'true')
  showLangPicker.value = false
  console.log('🌍 [语言切换] 语言已切换，localStorage已保存')
}
</script>

<template>
  <header class="bar">
    <button class="icon" @click="$emit('menu')">☰</button>
    <div class="title">ProDee</div>
    
    <!-- 语言选择器 -->
    <div class="lang-wrapper">
      <button class="lang-btn" @click="toggleLangPicker">
        <span class="flag">{{ currentLang().flag }}</span>
        <span class="arrow">▾</span>
      </button>
      
      <!-- 下拉菜单 -->
      <transition name="dropdown">
        <div v-if="showLangPicker" class="lang-dropdown">
          <button 
            v-for="lang in languages" 
            :key="lang.code"
            :class="['lang-option', { active: locale === lang.code }]"
            @click="changeLang(lang.code)"
          >
            <span class="flag">{{ lang.flag }}</span>
            <span class="name">{{ lang.label }}</span>
            <span v-if="locale === lang.code" class="check">✓</span>
          </button>
        </div>
      </transition>
    </div>
  </header>
  
  <!-- 点击外部关闭 -->
  <div v-if="showLangPicker" class="backdrop" @click="showLangPicker = false" />
</template>

<style scoped>
.bar {
  position: sticky;
  top: 0;
  z-index: 10000;
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}

.title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: #1a1a1a;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8f65 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.icon {
  border: 0;
  background: transparent;
  font-size: 21.6px;
  padding: 8px;
}

/* 语言选择器容器 */
.lang-wrapper {
  position: relative;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: transparent;
  padding: 6px 8px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.lang-btn:hover {
  background: rgba(0,0,0,.04);
}

.lang-btn .flag {
  font-size: 20px;
  line-height: 1;
}

.lang-btn .arrow {
  color: #999;
  font-size: 10px;
  margin-left: 2px;
}

/* 下拉菜单 */
.lang-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 140px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
  overflow: hidden;
  z-index: 10001;
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 10px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.lang-option:hover {
  background: #f5f5f5;
}

.lang-option.active {
  background: #fef3f2;
  color: #ff6b35;
}

.lang-option .flag {
  font-size: 18px;
}

.lang-option .name {
  flex: 1;
  font-weight: 500;
}

.lang-option .check {
  color: #ff6b35;
  font-size: 14px;
  font-weight: 700;
}

/* 透明遮罩 */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 19;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
  transform-origin: top right;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}
</style>
