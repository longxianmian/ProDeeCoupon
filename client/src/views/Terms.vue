<script setup>
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <section class="terms-page">
    <!-- 顶部导航 -->
    <header class="header">
      <button class="back-btn" @click="$router.back()">
        <span class="back-icon">‹</span>
      </button>
      <h1 class="title">{{ t('terms.title') || '用户协议' }}</h1>
    </header>

    <!-- 条款内容 -->
    <div class="terms-content">
      <!-- 生效日期与公司信息 -->
      <div class="date-section">
        <p class="company-info"><strong>{{ t('terms.companyInfo') }}：</strong>GEN CROSS CO., LTD.</p>
        <p class="company-details">{{ t('terms.registrationNumber') }}：0105567072731</p>
        <p class="company-details">{{ t('terms.registrationAddress') }}：27 Soi Prachanukul, Wong Sawang, Bang Sue, Bangkok</p>
        <p class="company-details">{{ t('terms.contactEmail') }}：bencothailand2024@gmail.com | {{ t('terms.contactPhone') }}：093-607-7989 | {{ t('terms.contact') }}：PAN</p>
        <p class="effective-date"><strong>{{ t('terms.effectiveDate') }}：</strong>【请填上线日期】 | <strong>{{ t('terms.version') }}：</strong>v1.0</p>
      </div>

      <!-- 服务条款内容 -->
      <div class="terms-sections">
        <!-- 1. 适用范围与接受 -->
        <section class="terms-section">
          <h2 class="section-title">{{ t('terms.scope.title') }}</h2>
          <p class="section-content">1.1 {{ t('terms.scope.content1') }}</p>
          <p class="section-content">1.2 {{ t('terms.scope.content2') }}</p>
        </section>

        <!-- 2. 账号与登录 -->
        <section class="terms-section">
          <h2 class="section-title">{{ t('terms.account.title') }}</h2>
          <p class="section-content">2.1 {{ t('terms.account.content1') }}</p>
          <p class="section-content">2.2 {{ t('terms.account.content2') }}</p>
          <p class="section-content">2.3 {{ t('terms.account.content3') }}</p>
        </section>

        <!-- 3. 功能与使用 -->
        <section class="terms-section">
          <h2 class="section-title">{{ t('terms.functions.title') }}</h2>
          <p class="section-content">3.1 <strong>{{ t('terms.functions.activities.title') }}。</strong> {{ t('terms.functions.activities.desc') }}</p>
          <ul class="terms-list">
            <li>{{ t('terms.functions.activities.line') }}</li>
            <li>{{ t('terms.functions.activities.browser') }}</li>
          </ul>
          <p class="section-content">3.2 {{ t('terms.functions.redemption') }}</p>
          <p class="section-content">3.3 {{ t('terms.functions.cityLang') }}</p>
          <p class="section-content">3.4 {{ t('terms.functions.sharing') }}</p>
        </section>

        <!-- 4. 用户行为规范 -->
        <section class="terms-section">
          <h2 class="section-title">{{ t('terms.conduct.title') }}</h2>
          <p class="section-content">{{ t('terms.conduct.intro') }}</p>
          <ul class="terms-list">
            <li>(a) {{ t('terms.conduct.item1') }}</li>
            <li>(b) {{ t('terms.conduct.item2') }}</li>
            <li>(c) {{ t('terms.conduct.item3') }}</li>
            <li>(d) {{ t('terms.conduct.item4') }}</li>
            <li>(e) {{ t('terms.conduct.item5') }}</li>
          </ul>
          <p class="section-content">{{ t('terms.conduct.conclusion') }}</p>
        </section>

        <!-- 5. 第三方服务 -->
        <section class="terms-section">
          <h2 class="section-title">{{ t('terms.thirdParty.title') }}</h2>
          <p class="section-content">{{ t('terms.thirdParty.content') }}</p>
        </section>

        <!-- 6. 知识产权 -->
        <section class="terms-section">
          <h2 class="section-title">{{ t('terms.intellectual.title') }}</h2>
          <p class="section-content">{{ t('terms.intellectual.content') }}</p>
        </section>

        <!-- 7. 免责声明与责任限制 -->
        <section class="terms-section">
          <h2 class="section-title">{{ t('terms.disclaimer.title') }}</h2>
          <p class="section-content">{{ t('terms.disclaimer.content') }}</p>
        </section>

        <!-- 8. 变更与终止 -->
        <section class="terms-section">
          <h2 class="section-title">{{ t('terms.changes.title') }}</h2>
          <p class="section-content">{{ t('terms.changes.content') }}</p>
        </section>

        <!-- 9. 适用法律与争议解决 -->
        <section class="terms-section">
          <h2 class="section-title">{{ t('terms.law.title') }}</h2>
          <p class="section-content">{{ t('terms.law.content') }}</p>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.terms-page {
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

.terms-content {
  padding: 16px;
}

.date-section {
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.effective-date,
.update-date {
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.update-date {
  margin-top: 4px;
}

.terms-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.terms-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 12px 0;
  border-left: 4px solid #ff6b35;
  padding-left: 12px;
}

.section-content {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.terms-list {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.terms-list li {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin-bottom: 8px;
}

.link-button {
  background: none;
  border: none;
  color: #ff6b35;
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-weight: 500;
}

.link-button:hover {
  color: #e55a2b;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .terms-content {
    padding: 12px;
  }
  
  .terms-section {
    padding: 16px;
  }
  
  .section-title {
    font-size: 15px;
  }
}
</style>