<template>
  <footer class="site-footer">
    <div class="footer-links">
      <a href="/terms" target="_blank">{{ t('footer.terms') }}</a>
      <span class="divider">|</span>
      <a href="/privacy" target="_blank">{{ t('footer.privacy') }}</a>
      <span class="divider">|</span>
      <a @click.prevent="showPlatformInfo">{{ t('footer.platformShort') }}</a>
      <span class="divider">|</span>
      <a @click.prevent="showVendorInfo">{{ t('footer.vendorShort') }}</a>
    </div>
  </footer>
</template>

<script setup>
import { h } from 'vue'
import { useI18n } from 'vue-i18n'
import { showDialog } from 'vant'

const { t } = useI18n()

// 显示平台主体信息
function showPlatformInfo() {
  showDialog({
    title: t('footer.platform'),
    message: h('div', { style: { textAlign: 'left', lineHeight: '1.6' } }, [
      h('p', { style: { margin: '8px 0', fontWeight: 'bold' } }, t('footer.platformName')),
      h('p', { style: { margin: '8px 0', fontSize: '13px', color: '#666' } }, t('footer.address')),
      h('p', { style: { margin: '8px 0', fontSize: '13px' } }, t('footer.dpoContact')),
      h('p', { style: { margin: '8px 0', fontSize: '13px' } }, [
        t('footer.contact') + ': ',
        h('a', { 
          href: `mailto:${t('footer.email')}`,
          style: { color: '#00B900', textDecoration: 'underline' }
        }, t('footer.email'))
      ]),
      h('p', { style: { margin: '8px 0', fontSize: '13px' } }, t('footer.phone'))
    ]),
    confirmButtonText: t('common.close') || '关闭',
    confirmButtonColor: '#00B900'
  })
}

// 显示履约方信息
function showVendorInfo() {
  showDialog({
    title: t('footer.vendor'),
    message: t('footer.vendorDesc'),
    confirmButtonText: t('common.close') || '关闭',
    confirmButtonColor: '#00B900'
  })
}
</script>

<style scoped>
.site-footer {
  font-size: 12px;
  line-height: 1.6;
  color: #9ca3af;
  border-top: 1px solid #f3f4f6;
  padding: 12px 16px;
  background: #ffffff;
  text-align: center;
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0;
}

.footer-links a {
  color: #6b7280;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0 4px;
}

.footer-links a:hover,
.footer-links a:active {
  color: #00B900;
  text-decoration: underline;
}

.footer-links .divider {
  color: #d1d5db;
  margin: 0 4px;
  user-select: none;
}
</style>
