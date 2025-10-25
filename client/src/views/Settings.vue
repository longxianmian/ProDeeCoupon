<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getMe, updateUser, logoutUser } from '@/services/user'
import { PROVINCES as provinceOptions, provinceLabel } from '@/constants/provinces'
import { useAuthStore } from '@/stores/auth'

const { locale, t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

// 数据状态
const me = ref(null)
const loading = ref(true)
const showLanguageSelector = ref(false)
const showProvinceSelector = ref(false)
const showLogoutConfirm = ref(false)

// 语言选项
const languageOptions = [
  { value: 'th-th', label: 'ไทย', flag: '🇹🇭' },
  { value: 'en-us', label: 'English', flag: '🇺🇸' },
  { value: 'zh-cn', label: '中文', flag: '🇨🇳' }
]

// 计算属性
const currentLanguage = computed(() => {
  const lang = languageOptions.find(lang => lang.value === locale.value)
  return lang || languageOptions[0]
})

const currentProvince = computed(() => {
  return provinceLabel(me.value?.province || localStorage.getItem('province') || 'bangkok', locale.value)
})

// 获取用户信息
async function fetchMe() {
  loading.value = true
  try {
    const res = await getMe()
    me.value = res || null
  } catch (err) {
    console.error('获取用户信息失败:', err)
    me.value = null
  } finally {
    loading.value = false
  }
}

// 更改语言
async function changeLanguage(lang) {
  locale.value = lang.value
  localStorage.setItem('user-language', lang.value)
  // 标记用户已明确设置语言
  localStorage.setItem('language-explicitly-set', 'true')
  showLanguageSelector.value = false
}

// 更改城市
async function changeProvince(province) {
  try {
    if (me.value) {
      await updateUser({ province: province.value })
      me.value.province = province.value
    } else {
      localStorage.setItem('province', province.value)
    }
    showProvinceSelector.value = false
  } catch (err) {
    console.error('更新城市失败:', err)
    alert(t('common.updateFailed') || '更新失败，请重试')
  }
}

// 退出登录
async function handleLogout() {
  console.log('👋 Settings: 开始退出登录...')
  
  try {
    // 1. 调用后端退出接口
    await logoutUser()
    
    // 2. 清除Pinia store状态
    console.log('🗑️ 清除Pinia store...')
    authStore.logout()
    console.log('✅ Pinia store已清除')
    
    // 3. 清除局部状态
    console.log('🗑️ 清除局部状态...')
    me.value = null
    console.log('✅ 局部状态已清除')
    
    // 4. 清除localStorage缓存
    localStorage.removeItem('user_token')
    localStorage.removeItem('liff_token')
    
    console.log('✅ 退出登录完成，即将刷新页面以清除所有状态...')
    
    // 5. 强制刷新页面以清除所有LIFF和前端状态
    setTimeout(() => {
      window.location.href = '/'
    }, 300)
  } catch (err) {
    console.error('❌ Settings退出登录异常:', err)
    // 即使出错也强制刷新
    setTimeout(() => {
      window.location.href = '/'
    }, 500)
  } finally {
    showLogoutConfirm.value = false
    console.log('✅ Settings: 退出登录完成')
  }
}

// 导航到页面
function navigateTo(path) {
  router.push(path)
}

onMounted(fetchMe)
</script>

<template>
  <section class="settings-page">
    <!-- 顶部导航 -->
    <header class="header">
      <button class="back-btn" @click="$router.back()">
        <span class="back-icon">‹</span>
      </button>
      <h1 class="title">{{ t('my.settings') || '设置' }}</h1>
    </header>

    <!-- 设置列表 -->
    <div class="settings-list">
      <!-- 账户设置 -->
      <div class="settings-section">
        <h2 class="section-title">{{ t('settings.account') || '账户设置' }}</h2>
        
        <div class="setting-item" @click="showLanguageSelector = true">
          <div class="setting-info">
            <span class="setting-icon">🌐</span>
            <span class="setting-label">{{ t('settings.language') || '语言' }}</span>
          </div>
          <div class="setting-value">
            <span class="current-value">{{ currentLanguage.flag }} {{ currentLanguage.label }}</span>
            <span class="arrow">›</span>
          </div>
        </div>

        <div class="setting-item" @click="showProvinceSelector = true">
          <div class="setting-info">
            <span class="setting-icon">📍</span>
            <span class="setting-label">{{ t('settings.location') || '所在城市' }}</span>
          </div>
          <div class="setting-value">
            <span class="current-value">{{ currentProvince }}</span>
            <span class="arrow">›</span>
          </div>
        </div>

        <div v-if="me" class="setting-item">
          <div class="setting-info">
            <span class="setting-icon">💰</span>
            <span class="setting-label">{{ t('my.myPoints') || '我的积分' }}</span>
          </div>
          <div class="setting-value">
            <span class="current-value">{{ me.points || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 隐私设置 -->
      <div class="settings-section">
        <h2 class="section-title">{{ t('settings.privacy') || '隐私设置' }}</h2>
        
        <div class="setting-item" @click="navigateTo('/privacy')">
          <div class="setting-info">
            <span class="setting-icon">🔒</span>
            <span class="setting-label">{{ t('settings.privacyPolicy') || '隐私政策' }}</span>
          </div>
          <div class="setting-value">
            <span class="arrow">›</span>
          </div>
        </div>

        <div class="setting-item" @click="navigateTo('/terms')">
          <div class="setting-info">
            <span class="setting-icon">📋</span>
            <span class="setting-label">{{ t('settings.termsOfService') || '服务条款' }}</span>
          </div>
          <div class="setting-value">
            <span class="arrow">›</span>
          </div>
        </div>
      </div>

      <!-- 帮助与支持 -->
      <div class="settings-section">
        <h2 class="section-title">{{ t('settings.support') || '帮助与支持' }}</h2>
        
        <div class="setting-item" @click="navigateTo('/help')">
          <div class="setting-info">
            <span class="setting-icon">❓</span>
            <span class="setting-label">{{ t('my.help') || '帮助中心' }}</span>
          </div>
          <div class="setting-value">
            <span class="arrow">›</span>
          </div>
        </div>

        <div class="setting-item" @click="navigateTo('/messages')">
          <div class="setting-info">
            <span class="setting-icon">💬</span>
            <span class="setting-label">{{ t('nav.messages') || '系统消息' }}</span>
          </div>
          <div class="setting-value">
            <span class="arrow">›</span>
          </div>
        </div>
      </div>

      <!-- 退出登录 -->
      <div v-if="me" class="settings-section">
        <div class="setting-item logout-item" @click="showLogoutConfirm = true">
          <div class="setting-info">
            <span class="setting-icon">🚪</span>
            <span class="setting-label logout-label">{{ t('settings.logout') || '退出登录' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 语言选择弹窗 -->
    <div v-if="showLanguageSelector" class="modal-overlay" @click="showLanguageSelector = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ t('settings.selectLanguage') || '选择语言' }}</h3>
          <button class="close-btn" @click="showLanguageSelector = false">×</button>
        </div>
        <div class="modal-body">
          <div class="option-list">
            <div 
              v-for="lang in languageOptions" 
              :key="lang.value"
              class="option-item"
              :class="{ active: lang.value === locale }"
              @click="changeLanguage(lang)"
            >
              <span class="option-flag">{{ lang.flag }}</span>
              <span class="option-label">{{ lang.label }}</span>
              <span v-if="lang.value === locale" class="check-icon">✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 城市选择弹窗 -->
    <div v-if="showProvinceSelector" class="modal-overlay" @click="showProvinceSelector = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ t('settings.selectLocation') || '选择城市' }}</h3>
          <button class="close-btn" @click="showProvinceSelector = false">×</button>
        </div>
        <div class="modal-body">
          <div class="option-list province-list">
            <div 
              v-for="province in provinceOptions" 
              :key="province.value"
              class="option-item"
              :class="{ active: province.value === (me?.province || localStorage.getItem('province') || 'bangkok') }"
              @click="changeProvince(province)"
            >
              <span class="option-label">{{ provinceLabel(province.value, locale) }}</span>
              <span v-if="province.value === (me?.province || localStorage.getItem('province') || 'bangkok')" class="check-icon">✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 退出登录确认弹窗 -->
    <div v-if="showLogoutConfirm" class="modal-overlay" @click="showLogoutConfirm = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ t('settings.confirmLogout') || '确认退出' }}</h3>
        </div>
        <div class="modal-body">
          <p>{{ t('settings.logoutMessage') || '确定要退出登录吗？' }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" @click="showLogoutConfirm = false">
            {{ t('common.cancel') || '取消' }}
          </button>
          <button class="btn btn-danger" @click="handleLogout">
            {{ t('settings.logout') || '退出登录' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  padding: 8px;
  margin-right: 8px;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #f0f0f0;
}

.back-icon {
  font-size: 24px;
  color: #333;
  font-weight: bold;
}

.title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.settings-list {
  padding: 16px;
}

.settings-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px 0;
  padding: 0 16px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-item {
  background: white;
  padding: 16px;
  margin-bottom: 1px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 8px;
  margin-bottom: 8px;
}

.setting-item:hover {
  background: #f8f9fa;
}

.setting-item:active {
  transform: scale(0.98);
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.setting-label {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.setting-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-value {
  font-size: 14px;
  color: #666;
}

.arrow {
  font-size: 18px;
  color: #ccc;
  font-weight: bold;
}

.logout-item {
  background: #fff5f5;
  border: 1px solid #fed7d7;
}

.logout-item:hover {
  background: #fef2f2;
}

.logout-label {
  color: #e53e3e;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 400px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
}

.modal-body {
  padding: 20px;
  max-height: 50vh;
  overflow-y: auto;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.province-list {
  max-height: 300px;
  overflow-y: auto;
}

.option-item {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.option-item:hover {
  background: #f8f9fa;
}

.option-item.active {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
}

.option-flag {
  font-size: 20px;
  margin-right: 12px;
}

.option-label {
  font-size: 16px;
  color: #333;
  flex: 1;
}

.check-icon {
  color: #ff6b35;
  font-weight: bold;
  font-size: 16px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f8f9fa;
  color: #666;
}

.btn-cancel:hover {
  background: #e9ecef;
}

.btn-danger {
  background: #e53e3e;
  color: white;
}

.btn-danger:hover {
  background: #c53030;
}

/* 加载状态 */
.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>