<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

// 展开状态
const expandedItems = ref(new Set())

// FAQ数据
const faqData = [
  {
    id: 1,
    category: 'account',
    question: t('help.howToRegister') || '如何注册账号？',
    answer: t('help.registerAnswer') || '您可以通过LINE一键登录来注册和登录账号。点击"用LINE一键登录"按钮，授权后即可完成注册。'
  },
  {
    id: 2,
    category: 'account',
    question: t('help.forgotPassword') || '忘记密码怎么办？',
    answer: t('help.forgotPasswordAnswer') || '由于我们使用LINE登录，您无需记住密码。只需通过LINE账号登录即可。'
  },
  {
    id: 3,
    category: 'coupon',
    question: t('help.howToGetCoupon') || '如何获取优惠券？',
    answer: t('help.getCouponAnswer') || '在首页浏览优惠活动，点击感兴趣的优惠券，然后点击"立即领取"按钮即可获得优惠券。'
  },
  {
    id: 4,
    category: 'coupon',
    question: t('help.howToUseCoupon') || '如何使用优惠券？',
    answer: t('help.useCouponAnswer') || '前往"我的优惠券"页面，选择要使用的优惠券，出示二维码或6位数核销码给店员扫描或输入即可。'
  },
  {
    id: 5,
    category: 'coupon',
    question: t('help.couponExpired') || '优惠券过期了怎么办？',
    answer: t('help.expiredAnswer') || '过期的优惠券无法使用。请注意优惠券的有效期，建议在有效期内及时使用。'
  },
  {
    id: 6,
    category: 'points',
    question: t('help.howToEarnPoints') || '如何获得积分？',
    answer: t('help.earnPointsAnswer') || '您可以通过以下方式获得积分：注册登录(+10分)、首次完善资料(+20分)、使用优惠券(+5分)、评价商家(+3分)。'
  },
  {
    id: 7,
    category: 'points',
    question: t('help.howToUsePoints') || '积分有什么用？',
    answer: t('help.usePointsAnswer') || '积分可以用来兑换特殊优惠券、提升会员等级、参与积分抽奖活动等。'
  },
  {
    id: 8,
    category: 'technical',
    question: t('help.appNotWorking') || '应用无法正常使用？',
    answer: t('help.appNotWorkingAnswer') || '请尝试刷新页面或重新打开应用。如果问题持续存在，请检查网络连接或联系客服。'
  },
  {
    id: 9,
    category: 'technical',
    question: t('help.qrCodeNotScanning') || '二维码无法扫描？',
    answer: t('help.qrCodeAnswer') || '请确保二维码清晰可见，手机摄像头对焦正确。您也可以使用6位数核销码作为备选方案。'
  }
]

// 分类
const categories = [
  { id: 'all', label: t('help.allCategories') || '全部', icon: '📋' },
  { id: 'account', label: t('help.account') || '账号相关', icon: '👤' },
  { id: 'coupon', label: t('help.coupon') || '优惠券', icon: '🎫' },
  { id: 'points', label: t('help.points') || '积分', icon: '💰' },
  { id: 'technical', label: t('help.technical') || '技术问题', icon: '🔧' }
]

// 当前选中的分类
const activeCategory = ref('all')

// 过滤FAQ
const filteredFAQ = computed(() => {
  if (activeCategory.value === 'all') {
    return faqData
  }
  return faqData.filter(item => item.category === activeCategory.value)
})

// 切换FAQ展开状态
function toggleFAQ(id) {
  if (expandedItems.value.has(id)) {
    expandedItems.value.delete(id)
  } else {
    expandedItems.value.add(id)
  }
}

// 联系客服
function contactSupport() {
  // 这里可以集成客服系统
  alert(t('help.contactMessage') || '客服功能即将上线，如有问题请通过系统消息联系我们！')
}

// 导航功能
function navigateTo(path) {
  router.push(path)
}
</script>

<template>
  <section class="help-page">
    <!-- 顶部导航 -->
    <header class="header">
      <button class="back-btn" @click="$router.back()">
        <span class="back-icon">‹</span>
      </button>
      <h1 class="title">{{ t('my.help') || '帮助中心' }}</h1>
    </header>

    <!-- 快速导航 -->
    <div class="quick-actions">
      <button class="action-btn" @click="contactSupport">
        <span class="action-icon">💬</span>
        <span class="action-label">{{ t('help.contactSupport') || '联系客服' }}</span>
      </button>
      <button class="action-btn" @click="navigateTo('/messages')">
        <span class="action-icon">📨</span>
        <span class="action-label">{{ t('nav.messages') || '系统消息' }}</span>
      </button>
    </div>

    <!-- 分类标签 -->
    <div class="category-tabs">
      <button
        v-for="category in categories"
        :key="category.id"
        class="category-tab"
        :class="{ active: activeCategory === category.id }"
        @click="activeCategory = category.id"
      >
        <span class="category-icon">{{ category.icon }}</span>
        <span class="category-label">{{ category.label }}</span>
      </button>
    </div>

    <!-- FAQ列表 -->
    <div class="faq-list">
      <div
        v-for="item in filteredFAQ"
        :key="item.id"
        class="faq-item"
        :class="{ expanded: expandedItems.has(item.id) }"
      >
        <div class="faq-question" @click="toggleFAQ(item.id)">
          <span class="question-text">{{ item.question }}</span>
          <span class="expand-icon" :class="{ rotated: expandedItems.has(item.id) }">‹</span>
        </div>
        <div class="faq-answer" v-show="expandedItems.has(item.id)">
          <p>{{ item.answer }}</p>
        </div>
      </div>
    </div>

    <!-- 联系信息 -->
    <div class="contact-section">
      <h2 class="contact-title">{{ t('help.stillNeedHelp') || '仍需帮助？' }}</h2>
      <p class="contact-desc">{{ t('help.contactDesc') || '如果以上信息无法解决您的问题，请通过以下方式联系我们：' }}</p>
      
      <div class="contact-methods">
        <div class="contact-method" @click="navigateTo('/messages')">
          <span class="method-icon">📧</span>
          <div class="method-info">
            <div class="method-label">{{ t('help.systemMessage') || '系统消息' }}</div>
            <div class="method-desc">{{ t('help.systemMessageDesc') || '通过应用内消息联系我们' }}</div>
          </div>
          <span class="method-arrow">›</span>
        </div>

        <div class="contact-method" @click="contactSupport">
          <span class="method-icon">💬</span>
          <div class="method-info">
            <div class="method-label">{{ t('help.onlineSupport') || '在线客服' }}</div>
            <div class="method-desc">{{ t('help.onlineSupportDesc') || '即时在线咨询服务' }}</div>
          </div>
          <span class="method-arrow">›</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.help-page {
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

.quick-actions {
  padding: 16px;
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  background: white;
  border: none;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.action-btn:active {
  transform: scale(0.98);
}

.action-icon {
  font-size: 24px;
}

.action-label {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.category-tabs {
  padding: 0 16px 16px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.category-tab {
  background: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.category-tab:hover {
  background: #f8f9fa;
}

.category-tab.active {
  background: #ff6b35;
  color: white;
}

.category-icon {
  font-size: 16px;
}

.category-label {
  font-size: 14px;
  font-weight: 500;
}

.faq-list {
  padding: 0 16px 16px;
}

.faq-item {
  background: white;
  border-radius: 12px;
  margin-bottom: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.faq-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.faq-question {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.2s;
}

.faq-question:hover {
  background: #f8f9fa;
}

.question-text {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  flex: 1;
}

.expand-icon {
  font-size: 20px;
  color: #666;
  font-weight: bold;
  transform: rotate(-90deg);
  transition: transform 0.2s;
}

.expand-icon.rotated {
  transform: rotate(-270deg);
}

.faq-answer {
  padding: 0 16px 16px;
  border-top: 1px solid #eee;
  background: #f8f9fa;
}

.faq-answer p {
  margin: 12px 0 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #666;
}

.contact-section {
  padding: 24px 16px;
  background: white;
  margin: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.contact-title {
  font-size: 18px;
  color: #333;
  margin: 0 0 8px 0;
  font-weight: bold;
}

.contact-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 20px 0;
  line-height: 1.6;
}

.contact-methods {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-method {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.contact-method:hover {
  background: #f0f0f0;
  transform: translateY(-1px);
}

.contact-method:active {
  transform: scale(0.98);
}

.method-icon {
  font-size: 24px;
  margin-right: 12px;
}

.method-info {
  flex: 1;
}

.method-label {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  margin-bottom: 4px;
}

.method-desc {
  font-size: 12px;
  color: #666;
}

.method-arrow {
  font-size: 18px;
  color: #ccc;
  font-weight: bold;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .quick-actions {
    padding: 12px;
  }
  
  .category-tabs {
    padding: 0 12px 12px;
  }
  
  .faq-list {
    padding: 0 12px 12px;
  }
  
  .contact-section {
    margin: 12px;
    padding: 20px 12px;
  }
}
</style>