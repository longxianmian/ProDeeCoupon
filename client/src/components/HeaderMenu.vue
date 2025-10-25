<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ensureLogin } from '@/services/line'
import { facebookLogin } from '@/services/facebookAuth'
import { getMe, logoutUser } from '@/services/user'
import { parseScanText } from '@/utils/scan'
import { useAuthStore } from '@/stores/auth'
import { getPlatform, getPlatformName } from '@/utils/platformDetector'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['update:open'])
const router = useRouter()
const { locale, t } = useI18n()
const authStore = useAuthStore()

// 展示数据
const me = ref(null) // { avatar, nickname }
const loading = ref(true)
const logging = ref(false)

// 检查后端会话是否有效（Cookie-based认证）
async function checkBackendSession() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      // 修复：/api/me 返回 { success: true, data: {...} } 格式
      return data.success === true && data.data ? data : null
    }
    return null
  } catch (e) {
    console.error('检查会话失败:', e)
    return null
  }
}

async function bootstrap(){
  loading.value = true
  try{
    // 使用Cookie会话检查（新的认证方式）
    const data = await checkBackendSession()
    if (data && data.data) {
      console.log('✅ HeaderMenu: 检测到登录会话:', data.data)
      me.value = { 
        avatar: data.data.picture || data.data.avatar, 
        nickname: data.data.name || data.data.nickname 
      }
    } else {
      console.log('🚫 HeaderMenu: 无有效会话，用户未登录')
      me.value = null
    }
  } catch(e) {
    console.error('❌ HeaderMenu初始化失败:', e)
    me.value = null
  } finally{ 
    loading.value = false 
  }
}

onMounted(()=>{ if (props.open) bootstrap() })
watch(() => props.open, v => { if (v) bootstrap() })

// 监听 authStore 状态变化，实时同步退出登录状态
watch(() => authStore.me, (newMe) => {
  console.log('🔄 HeaderMenu: authStore.me 变化:', newMe)
  if (!newMe) {
    // 用户已退出，清空本地状态
    me.value = null
    console.log('✅ HeaderMenu: 已同步清空用户状态')
  } else if (authStore.isAuthenticated && !me.value) {
    // 用户刚登录，刷新显示
    me.value = { avatar: newMe.avatar, nickname: newMe.nickname }
    console.log('✅ HeaderMenu: 检测到登录，更新用户显示')
  }
})

function close(){ emit('update:open', false) }

// 获取当前平台信息
const platform = computed(() => getPlatform())
const platformName = computed(() => getPlatformName(locale.value))

// 获取平台对应的颜色
const platformColor = computed(() => {
  const colors = {
    line: '#00B900',      // LINE绿色
    facebook: '#1877F2',  // Facebook蓝色
    tiktok: '#FE2C55',    // TikTok粉红色
    browser: '#00B900'    // 默认用LINE绿色
  }
  return colors[platform.value] || colors.browser
})

// 获取登录按钮文字（智能检测：LINE/Facebook/手机号）
const loginButtonText = computed(() => {
  const currentPlatform = platform.value
  
  // 根据不同平台返回不同的翻译键
  if (currentPlatform === 'facebook') {
    return t('menu.loginWithFacebook')
  } else if (currentPlatform === 'line') {
    return t('menu.loginWithLine')
  } else {
    // 浏览器环境，显示手机号登录
    return t('menu.loginWithPhone')
  }
})

// 获取动态CSS类名
const platformClass = computed(() => {
  return `platform-${platform.value}`
})

async function doLogin(){
  const currentPlatform = platform.value
  console.log(`🔐 HeaderMenu: 开始登录...`, 'platform:', currentPlatform)
  logging.value = true
  
  try{
    // 根据平台选择不同的登录方式
    if (currentPlatform === 'facebook') {
      console.log('👍 使用 Facebook 登录')
      await facebookLogin()
      // Facebook登录成功后会自动刷新页面
      return
    } else if (currentPlatform === 'tiktok') {
      console.log('🎵 TikTok 登录暂未实现')
      alert('TikTok登录功能即将上线，敬请期待！')
      return
    } else if (currentPlatform === 'browser') {
      // 浏览器环境，显示手机号登录提示（功能待实现）
      console.log('📱 手机号登录功能即将上线')
      alert('手机号登录功能即将上线，敬请期待！\n目前请使用LINE浏览器打开页面进行登录。')
      return
    } else {
      // LINE 平台，使用 LINE 登录
      console.log('📱 使用 LINE 登录')
      const loginResult = await ensureLogin()
      
      // 如果正在重定向到登录页面，则等待
      if (loginResult.redirecting) {
        console.log('🔄 HeaderMenu: 正在跳转到LINE登录...')
        return
      }
      
      // 登录成功，刷新用户信息
      if (loginResult.loggedIn) {
        console.log('✅ HeaderMenu: 登录成功，刷新用户信息')
        await bootstrap()
        close()
      }
    }
  }catch(e){ 
    console.error(`❌ 登录失败:`, e)
    console.error('登录错误详情:', {
      message: e.message,
      code: e.code,
      stack: e.stack
    })
    alert(t('common.loginFailed') || '登录失败，请重试') 
  } finally{ 
    logging.value = false 
  }
}

async function doLogout(){
  console.log('👋 HeaderMenu: 开始退出登录...')
  
  try {
    // 调用统一的退出登录逻辑
    await logoutUser()
    
    // 清除Pinia store状态
    console.log('🗑️ 清除Pinia store...')
    authStore.logout()
    console.log('✅ Pinia store已清除')
    
    // 清除局部状态
    console.log('🗑️ 清除局部状态...')
    me.value = null
    console.log('✅ 局部状态已清除')
    
    // 跳转到首页
    console.log('🏠 跳转到首页...')
    await router.push('/')
    console.log('✅ 已跳转到首页')
    
    // 关闭侧边栏
    close()
  } catch (err) {
    console.error('❌ HeaderMenu退出登录异常:', err)
  } finally {
    console.log('✅ HeaderMenu: 退出登录完成')
  }
}


// 扫一扫
async function onScan(){
  try{
    const liff = window.liff
    if (liff && liff.isApiAvailable && liff.isApiAvailable('scanCode')){
      const res = await liff.scanCodeV2?.() || await liff.scanCode?.()
      const value = res?.value || res?.result || res
      const { targetUrl } = parseScanText(value)
      if (targetUrl) router.push(targetUrl)
      close();
      return
    }
  }catch(_){ /* ignore and fallback */ }
  router.push('/scan'); close()
}
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="mask" @click.self="close">
      <aside class="drawer">
        <!-- 顶部用户区域 -->
        <div class="user-section">
          <!-- 已登录状态 -->
          <template v-if="me">
            <div class="user-card">
              <img class="user-avatar" :src="me.avatar" @error="($event.target.src='https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg')"/>
              <div class="user-info">
                <div class="user-name">{{ me.nickname }}</div>
                <div class="user-status">{{ t('menu.account') || '账号' }}</div>
              </div>
              <button class="logout-btn" @click="doLogout" :title="t('menu.logout') || '退出登录'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
                  <polyline points="16,17 21,12 16,7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          </template>
          
          <!-- 未登录状态 -->
          <template v-else>
            <div class="login-section">
              <button 
                class="login-btn"
                :class="platformClass"
                :disabled="logging" 
                @click="doLogin"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {{ loginButtonText }}
              </button>
            </div>
          </template>
        </div>

        <!-- 主菜单 -->
        <div class="menu-section">
          <div class="menu-list">
            <!-- 优惠券 -->
            <div class="menu-item" @click="router.push('/me?tab=coupons'); close()">
              <div class="menu-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="7" width="18" height="10" rx="2" ry="2"></rect>
                  <line x1="12" y1="7" x2="12" y2="17"></line>
                  <circle cx="8" cy="12" r="1" fill="currentColor"></circle>
                  <circle cx="16" cy="12" r="1" fill="currentColor"></circle>
                </svg>
              </div>
              <div class="menu-content">
                <div class="menu-label">{{ t('my.myCoupons') || '优惠券' }}</div>
              </div>
              <div class="menu-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </div>
            </div>

            <!-- 我的订单 -->
            <div class="menu-item" @click="router.push('/me?tab=orders'); close()">
              <div class="menu-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path>
                  <polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <div class="menu-content">
                <div class="menu-label">{{ t('my.orders') || '我的订单' }}</div>
              </div>
              <div class="menu-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </div>
            </div>

            <!-- 核销记录 -->
            <div class="menu-item" @click="router.push('/me?tab=redemptions'); close()">
              <div class="menu-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                  <line x1="9" y1="12" x2="15" y2="12"></line>
                </svg>
              </div>
              <div class="menu-content">
                <div class="menu-label">{{ t('my.redemptions') || '核销记录' }}</div>
              </div>
              <div class="menu-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </div>
            </div>

            <!-- 积分 -->
            <div class="menu-item" @click="router.push('/me?tab=points'); close()">
              <div class="menu-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                  <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
                </svg>
              </div>
              <div class="menu-content">
                <div class="menu-label">{{ t('my.myPoints') || '积分' }}</div>
              </div>
              <div class="menu-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </div>
            </div>

            <div class="menu-item" @click="onScan">
              <div class="menu-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
              <div class="menu-content">
                <div class="menu-label">{{ t('menu.scan') || '扫一扫' }}</div>
                <div class="menu-value">LIFF / H5</div>
              </div>
              <div class="menu-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </div>
            </div>

            <div class="menu-item" @click="router.push('/help'); close()">
              <div class="menu-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div class="menu-content">
                <div class="menu-label">{{ t('menu.help') || '帮助' }}</div>
              </div>
              <div class="menu-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </div>
            </div>

            <div class="menu-item" @click="router.push('/settings'); close()">
              <div class="menu-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                </svg>
              </div>
              <div class="menu-content">
                <div class="menu-label">{{ t('menu.settings') || '设置' }}</div>
              </div>
              <div class="menu-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- 页脚 -->
        <div class="menu-footer">
          <div class="footer-links">
            <button class="footer-link" @click="router.push('/terms'); close()">
              {{ t('home.terms') || '使用条款' }}
            </button>
            <span class="footer-divider">|</span>
            <button class="footer-link" @click="router.push('/privacy'); close()">
              {{ t('home.privacy') || '隐私政策' }}
            </button>
            <span class="footer-divider">|</span>
            <button class="footer-link" @click="router.push('/data-deletion'); close()">
              {{ t('menu.dataDeletion') || '数据删除' }}
            </button>
          </div>
          <div class="footer-copyright">
            {{ t('menu.copyright') || '© 2025 ProDee. 保留所有权利' }}
          </div>
        </div>
      </aside>
    </div>
  </transition>
</template>

<style scoped>
/* 遮罩层和抽屉 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 10010;
  display: flex;
  justify-content: flex-start;
}

.drawer {
  width: 224px;
  max-width: 80vw;
  height: 100%;
  background: #ffffff;
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
  padding: 0;
  overflow: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

/* 用户区域 */
.user-section {
  padding: 20px 16px 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 17px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.logout-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.login-section {
  padding: 0;
  margin-top: 16px;
  margin-bottom: 24px;
}

.login-btn {
  width: 100%;
  background: #06c755;
  color: white;
  border: none;
  padding: 14px 16px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(6, 199, 85, 0.3);
}

/* 平台特定样式 - LINE（绿色） */
.login-btn.platform-line {
  background: linear-gradient(135deg, #06c755 0%, #05b548 100%);
  box-shadow: 0 4px 12px rgba(6, 199, 85, 0.3);
}

.login-btn.platform-line:hover {
  background: linear-gradient(135deg, #05b548 0%, #049f40 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(6, 199, 85, 0.4);
}

/* 平台特定样式 - Browser/手机号（橙色） */
.login-btn.platform-browser {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.login-btn.platform-browser:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
}

/* 平台特定样式 - Facebook（蓝色） */
.login-btn.platform-facebook {
  background: linear-gradient(135deg, #1877F2 0%, #0e5fc4 100%);
  box-shadow: 0 4px 12px rgba(24, 119, 242, 0.3);
}

.login-btn.platform-facebook:hover {
  background: linear-gradient(135deg, #0e5fc4 0%, #0a4fa3 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(24, 119, 242, 0.4);
}

/* 平台特定样式 - TikTok（粉红色） */
.login-btn.platform-tiktok {
  background: linear-gradient(135deg, #FE2C55 0%, #d41f44 100%);
  box-shadow: 0 4px 12px rgba(254, 44, 85, 0.3);
}

.login-btn.platform-tiktok:hover {
  background: linear-gradient(135deg, #d41f44 0%, #b51936 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(254, 44, 85, 0.4);
}

/* 禁用状态（所有平台通用） */
.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 菜单区域 */
.menu-section {
  padding: 20px;
  padding-top: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 菜单列表 */
.menu-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s;
  gap: 12px;
}

.menu-item:hover {
  background: #f8fafc;
  transform: translateX(4px);
}

.menu-icon {
  width: 40px;
  height: 40px;
  background: #f1f5f9;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.2s;
}

.menu-item:hover .menu-icon {
  background: #e2e8f0;
  color: #475569;
}

.menu-content {
  flex: 1;
  min-width: 0;
}

.menu-label {
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 2px;
}

.menu-value {
  font-size: 12px;
  color: #64748b;
}

.menu-arrow {
  color: #cbd5e1;
  transition: all 0.2s;
}

.menu-item:hover .menu-arrow {
  color: #94a3b8;
  transform: translateX(2px);
}

/* 页脚 */
.menu-footer {
  margin-top: auto;
  padding: 16px 20px 20px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.footer-link {
  background: none;
  border: none;
  color: #64748b;
  font-size: 12px;
  padding: 0;
  cursor: pointer;
  transition: color 0.2s;
  white-space: nowrap;
}

.footer-link:hover {
  color: #475569;
  text-decoration: underline;
}

.footer-divider {
  color: #cbd5e1;
  font-size: 12px;
  user-select: none;
}

.footer-copyright {
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}

/* 底部选择器 */
.sheet {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  z-index: 95;
}

.sheet-body {
  width: 100%;
  background: white;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 0;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.sheet-title {
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
}

.sheet-close-btn {
  background: #f8fafc;
  border: none;
  color: #64748b;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-close-btn:hover {
  background: #f1f5f9;
  color: #475569;
}

.sheet-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 20px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.sheet-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.sheet-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.sheet-cancel {
  margin: 16px 20px 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  padding: 14px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.sheet-cancel:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

/* 动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .drawer {
    width: 300px;
    max-width: 85vw;
  }
  
  .sheet-list {
    grid-template-columns: 1fr;
  }
}
</style>