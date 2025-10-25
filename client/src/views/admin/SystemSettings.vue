<template>
  <div class="system-settings">
    <el-card class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h2>{{ $t('admin.menu.systemSettings') }}</h2>
          <p class="subtitle">{{ $t('admin.systemSettings.subtitle') }}</p>
        </div>
      </div>
    </el-card>

    <el-card class="content-card">
      <el-empty 
        :description="$t('admin.systemSettings.comingSoon')" 
        :image-size="200"
      >
        <template #image>
          <el-icon :size="100" color="#909399"><Setting /></el-icon>
        </template>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup>
import { Setting } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.system-settings {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.content-card {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
