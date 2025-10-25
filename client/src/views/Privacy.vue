<script setup>
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <section class="privacy-page">
    <!-- 顶部导航 -->
    <header class="header">
      <button class="back-btn" @click="$router.back()">
        <span class="back-icon">‹</span>
      </button>
      <h1 class="title">{{ t('home.privacy') || '隐私政策' }}</h1>
    </header>

    <!-- 隐私政策内容 -->
    <div class="privacy-content">
      <!-- 生效日期与公司信息 -->
      <div class="date-section">
        <p class="company-info"><strong>{{ t('privacy.controller') || '数据控制者' }}：</strong>GEN CROSS CO., LTD.</p>
        <p class="company-details">{{ t('privacy.registrationAddress') || '注册地址' }}：27 Soi Prachanukul, Wong Sawang, Bang Sue, Bangkok</p>
        <p class="company-details">{{ t('privacy.dpoContact') || 'DPO/隐私联系人' }}：PAN | {{ t('privacy.email') || '邮箱' }}：bencothailand2024@gmail.com | {{ t('privacy.phone') || '电话' }}：093-607-7989</p>
        <p class="effective-date"><strong>{{ t('privacy.effectiveDate') || '生效日期' }}：</strong>【请填上线日期】 | <strong>{{ t('privacy.version') || '版本号' }}：</strong>v1.0</p>
        <p class="compliance-note">{{ t('privacy.complianceNote') || '本政策遵循泰国 PDPA（B.E.2562）；在适用范围内参考 GDPR 的通用原则与跨境传输要求。' }}</p>
      </div>

      <!-- 隐私政策内容 -->
      <div class="privacy-sections">
        <!-- 1. 我们收集哪些数据 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.collection.title') || '1. 我们收集哪些数据' }}</h2>
          <ul class="privacy-list">
            <li><strong>{{ t('privacy.collection.identity') || '身份与账号' }}：</strong>{{ t('privacy.collection.identityDesc') || 'LINE userId、头像、昵称（登录与展示）' }}；</li>
            <li><strong>{{ t('privacy.collection.role') || '角色与门店' }}：</strong>{{ t('privacy.collection.roleDesc') || 'isStaff、storeId、门店名称（仅店员）' }}；</li>
            <li><strong>{{ t('privacy.collection.usage') || '使用与技术' }}：</strong>{{ t('privacy.collection.usageDesc') || '设备/浏览器信息、IP 近似地理位置、语言、城市（省/府）、页面停留、崩溃日志' }}；</li>
            <li><strong>{{ t('privacy.collection.marketing') || '营销归因' }}：</strong>{{ t('privacy.collection.marketingDesc') || 'UTM（source/medium/campaign/content/term）、fbclid/ttclid、OA 菜单版本/槽位标记' }}；</li>
            <li><strong>{{ t('privacy.collection.transaction') || '交易记录' }}：</strong>{{ t('privacy.collection.transactionDesc') || '领取/核销记录（券/活动 ID、时间、门店、操作人等）' }}；</li>
            <li><strong>{{ t('privacy.collection.qrCode') || '二维码内容' }}：</strong>{{ t('privacy.collection.qrCodeDesc') || '为跳转/核销所需的 URL/编码文本（限目的使用）' }}；</li>
            <li><strong>{{ t('privacy.collection.communication') || '沟通与客服' }}：</strong>{{ t('privacy.collection.communicationDesc') || '你提交的反馈、工单或沟通记录' }}。</li>
          </ul>
          <p class="section-content note">{{ t('privacy.collection.sensitiveNote') || '我们不主动收集敏感个人数据；如确因业务需要，将另行取得必要同意。' }}</p>
        </section>

        <!-- 2. 收集来源 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.sources.title') || '2. 收集来源' }}</h2>
          <p class="section-content">{{ t('privacy.sources.content') || '你在 H5/LIFF 中提交或授权；使用过程中自动采集；来自门店/商家或后台操作（仅授权信息，如店员绑定）。' }}</p>
        </section>

        <!-- 3. 处理目的与法律依据 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.legalBasis.title') || '3. 处理目的与法律依据' }}</h2>
          <ul class="privacy-list">
            <li><strong>{{ t('privacy.legalBasis.contract') || '提供服务/履行合同' }}：</strong>{{ t('privacy.legalBasis.contractDesc') || '登录、展示活动、领取/核销、店员工作台（PDPA: Contract）' }}；</li>
            <li><strong>{{ t('privacy.legalBasis.legitimate') || '合法利益' }}：</strong>{{ t('privacy.legalBasis.legitimateDesc') || '防作弊与风控、产品优化与统计（PDPA: Legitimate Interests——做最小必要评估）' }}；</li>
            <li><strong>{{ t('privacy.legalBasis.legal') || '法律义务' }}：</strong>{{ t('privacy.legalBasis.legalDesc') || '税务/审计/监管要求（PDPA: Legal Obligation）' }}；</li>
            <li><strong>{{ t('privacy.legalBasis.consent') || '同意' }}：</strong>{{ t('privacy.legalBasis.consentDesc') || '可选的营销通知、非必要 Cookie/标识符、未成年人相关处理（可随时撤回，不影响撤回前的处理合法性）' }}。</li>
          </ul>
        </section>

        <!-- 4. Cookies / 本地存储 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.cookies.title') || '4. Cookies / 本地存储' }}</h2>
          <p class="section-content">{{ t('privacy.cookies.content') || '用于保存语言、城市、会话与归因（UTM、fbclid/ttclid）。你可在浏览器中限制，但可能影响体验（如城市记忆、免登录）。' }}</p>
        </section>

        <!-- 5. 共享与委托处理 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.sharing.title') || '5. 共享与委托处理' }}</h2>
          <ul class="privacy-list">
            <li><strong>{{ t('privacy.sharing.merchants') || '商家/门店' }}：</strong>{{ t('privacy.sharing.merchantsDesc') || '为核销、售后与统计之目的共享必要信息' }}；</li>
            <li><strong>{{ t('privacy.sharing.providers') || '服务商' }}：</strong>{{ t('privacy.sharing.providersDesc') || '云托管、数据库、对象存储、日志与分析、消息推送、LINE 平台等（签署数据处理协议）' }}；</li>
            <li><strong>{{ t('privacy.sharing.legal') || '法律与合规' }}：</strong>{{ t('privacy.sharing.legalDesc') || '依法向监管/法院/执法机关提供' }}。</li>
          </ul>
          <p class="section-content note">{{ t('privacy.sharing.noSale') || '我们不出售你的个人数据。' }}</p>
        </section>

        <!-- 6. 跨境传输 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.crossBorder.title') || '6. 跨境传输' }}</h2>
          <p class="section-content">{{ t('privacy.crossBorder.content') || '服务器或服务商可能位于泰国境外（如新加坡/日本/美国）。我们按 PDPA 要求采取适当保障并限目的传输。' }}</p>
        </section>

        <!-- 7. 保留期限 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.retention.title') || '7. 保留期限' }}</h2>
          <ul class="privacy-list">
            <li>{{ t('privacy.retention.account') || '账户与基础资料：自最后一次使用起 2 年' }}；</li>
            <li>{{ t('privacy.retention.records') || '领取/核销与门店经营记录：3 年（或法律要求更长）' }}；</li>
            <li>{{ t('privacy.retention.logs') || '日志与风控数据：180 天–1 年' }}。</li>
          </ul>
          <p class="section-content">{{ t('privacy.retention.deletion') || '期满删除或匿名化；你申请删除时，在法律允许与留存义务范围内处理。' }}</p>
        </section>

        <!-- 8. 你的权利（PDPA） -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.rights.title') || '8. 你的权利（PDPA）' }}</h2>
          <p class="section-content">{{ t('privacy.rights.intro') || '你可请求：访问/复制、更正、删除、限制或反对处理、数据可携带、撤回同意（不影响撤回前的合法性）。你也可向 PDPC（泰国个人数据保护委员会）投诉。我们一般在 30 天内答复。' }}</p>
        </section>

        <!-- 9. 未成年人 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.minors.title') || '9. 未成年人' }}</h2>
          <p class="section-content">{{ t('privacy.minors.content') || '本服务不以未满 13 周岁为目标用户。若你未满 20 周岁且处理基于同意，需在 PDPA 要求下征得监护人同意。' }}</p>
        </section>

        <!-- 10. 安全 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.security.title') || '10. 安全' }}</h2>
          <p class="section-content">{{ t('privacy.security.content') || '我们采用访问控制、加密传输、最小权限、审计与异常检测等措施保护数据安全；但互联网环境并非绝对安全，请妥善保管设备与账户。' }}</p>
        </section>

        <!-- 11. 营销通信 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.marketing.title') || '11. 营销通信' }}</h2>
          <p class="section-content">{{ t('privacy.marketing.content') || '你可通过设置或消息中的退订指引选择不再接收营销通知（服务通知不受影响）。' }}</p>
        </section>

        <!-- 12. 变更 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.changes.title') || '12. 变更' }}</h2>
          <p class="section-content">{{ t('privacy.changes.content') || '我们可能会更新本政策并在页面显著位置提示；如属重大变更，将在必要时重新征求你的同意。' }}</p>
        </section>

        <!-- 13. 联系我们 -->
        <section class="privacy-section">
          <h2 class="section-title">{{ t('privacy.contact.title') || '13. 联系我们' }}</h2>
          <div class="contact-info">
            <p class="section-content"><strong>{{ t('privacy.controller') || '数据控制者' }}：</strong>GEN CROSS CO., LTD.</p>
            <p class="section-content"><strong>{{ t('privacy.dpoContact') || 'DPO/隐私联系人' }}：</strong>PAN | <strong>{{ t('privacy.email') || '邮箱' }}：</strong>bencothailand2024@gmail.com | <strong>{{ t('privacy.phone') || '电话' }}：</strong>093-607-7989</p>
            <p class="section-content"><strong>{{ t('privacy.address') || '通信地址' }}：</strong>27 Soi Prachanukul, Wong Sawang, Bang Sue, Bangkok</p>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.privacy-page {
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

.privacy-content {
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

.privacy-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.privacy-section {
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
  border-left: 4px solid #007AFF;
  padding-left: 12px;
}

.subsection-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin: 16px 0 8px 0;
}

.section-content {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.privacy-list {
  margin: 0 0 16px 0;
  padding-left: 20px;
  list-style-type: disc;
}

.privacy-list li {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin-bottom: 8px;
}

.storage-info {
  margin-top: 12px;
}

.rights-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007AFF;
}

.right-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin: 0 0 6px 0;
}

.right-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin: 0;
}

.contact-methods {
  margin-top: 16px;
}

.contact-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #007AFF;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.contact-btn:hover {
  background: #0056D3;
  transform: translateY(-1px);
}

.contact-btn:active {
  transform: scale(0.98);
}

.contact-icon {
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .privacy-content {
    padding: 12px;
  }
  
  .privacy-section {
    padding: 16px;
  }
  
  .section-title {
    font-size: 15px;
  }
  
  .rights-list {
    gap: 12px;
  }
  
  .right-item {
    padding: 12px;
  }
}
</style>