<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import HeaderBar from '@/components/HeaderBar.vue'
import CategoryBar from '@/components/CategoryBar.vue'
import HomeFeed from '@/components/HomeFeed.vue'
import MyCenter from '@/components/MyCenter.vue'
import BottomNav from '@/components/BottomNav.vue'
import MessageCenter from '@/components/MessageCenter.vue'
import RewardsMall from '@/views/RewardsMall.vue'
import HeaderMenu from '@/components/HeaderMenu.vue'
import { useMsgStore } from '@/stores/msg'
import { useAuthStore } from '@/stores/auth'
import StaffStore from '@/views/StaffStore.vue'
import StaffActivities from '@/views/StaffActivities.vue'
import StaffMy from '@/views/StaffMy.vue'

const { t } = useI18n()
const router = useRouter()
const tab = ref('home')
const category = ref('')
const menuOpen = ref(false)
const msgStore = useMsgStore()
const authStore = useAuthStore()
const pageLoading = ref(true)

// 监听tab变化（不再跳转，统一在Home内切换）
// rewards tab现在也在Home中显示，保持底部导航统一

// 监听店员状态变化，切换合适的tab
watch(() => authStore.isStaff, (isStaff) => {
  if (isStaff) {
    // 切换到店员模式，设置默认tab为第一个店员tab
    tab.value = 's-acts'
  } else {
    // 切换到用户模式，设置默认tab为home
    tab.value = 'home'
  }
}, { immediate: false })

onMounted(async ()=>{
  try {
    // 立即显示基础UI，先加载关键数据
    pageLoading.value = false
    
    // 快速加载用户状态（影响界面布局）
    await authStore.refresh().catch(()=>{})
    
    // 检查URL参数中的tab值
    const urlTab = router.currentRoute.value.query.tab
    
    // 根据店员状态或URL参数设置初始tab
    if (authStore.isStaff) {
      tab.value = 's-acts'
    } else if (urlTab && ['home', 'rewards', 'msg', 'me'].includes(urlTab)) {
      // 如果URL中指定了合法的tab，使用该tab
      tab.value = urlTab
      // 清除URL中的tab参数，避免刷新时重复切换
      router.replace({ query: {} })
    } else {
      tab.value = 'home'
    }
    
    // 后台异步加载非关键数据
    Promise.all([
      msgStore.refresh().catch(()=>{})
    ])
  } catch (error) {
    console.error('首页初始化失败:', error)
    pageLoading.value = false
  }
})
</script>

<template>
  <div class="page">
    <!-- 页面加载状态 -->
    <Transition name="fade" appear>
      <div v-if="pageLoading" class="page-loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">{{ t('common.loading') || '加载中...' }}</p>
      </div>
    </Transition>
    
    <!-- 用户模式 -->
    <Transition name="slide-up" appear>
      <div v-if="!pageLoading && !authStore.isStaff" class="content-wrapper">
        <HeaderBar @menu="menuOpen = true" />
        <CategoryBar v-if="tab==='home'" v-model="category" />

        <HomeFeed v-if="tab==='home'"
                  :tab="tab" :category="category" />

        <MessageCenter v-else-if="tab==='msg'" />
        <RewardsMall v-else-if="tab==='rewards'" :hide-nav-bar="true" />
        <MyCenter v-else-if="tab==='me'" />

        <div class="pad-bottom" />
        <BottomNav v-model="tab" :unread="{ msg: msgStore.unread }" variant="user" />
      </div>
    </Transition>

    <!-- 店员模式 -->
    <Transition name="slide-up" appear>
      <div v-if="!pageLoading && authStore.isStaff" class="content-wrapper">
        <HeaderBar @menu="menuOpen = true" />
        
        <StaffActivities v-if="tab==='s-acts'" />
        <StaffStore v-else-if="tab==='s-store'" />
        <StaffMy v-else-if="tab==='s-me'" />

        <div class="pad-bottom" />
        <BottomNav v-model="tab" variant="staff" />
      </div>
    </Transition>

    <HeaderMenu v-model:open="menuOpen" />
  </div>
</template>

<style scoped>
.page{min-height:100vh;background:#fff}
.placeholder{padding:16px}
/* 给底部导航预留空间，避免内容被遮挡 */
.pad-bottom{height:calc(var(--bottom-nav-h) + 8px)}

/* 页面加载状态 */
.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: 40px 20px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 页面切换动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition: all 0.3s ease-out;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.content-wrapper {
  width: 100%;
  height: 100%;
}
</style>