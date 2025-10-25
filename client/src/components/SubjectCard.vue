<template>
  <div class="subject-card">
    <div class="row">
      <strong>{{ t('subject.platformTitle') }}</strong>
      <span>{{ t('subject.platformValue') }}</span>
    </div>
    <div class="row">
      <strong>{{ t('subject.vendorTitle') }}</strong>
      <span>{{ t('subject.vendorValue') }}</span>
    </div>
    <p class="note">{{ t('subject.note') }}</p>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.subject-card {
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  margin: 12px 0;
  background: #fafafa;
}

.subject-card .row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  margin: 6px 0;
}

.subject-card strong {
  white-space: nowrap;
  font-size: 14px;
  color: #333;
}

.subject-card span {
  font-size: 14px;
  color: #666;
  word-break: break-word;
}

.subject-card .note {
  color: #666;
  font-size: 12px;
  margin-top: 8px;
  margin-bottom: 0;
  line-height: 1.5;
}
</style>
