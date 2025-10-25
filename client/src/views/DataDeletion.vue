<template>
  <div class="data-deletion-page">
    <HeaderBar :title="t('dd.title')" />
    
    <div class="content">
      <!-- 标题与更新时间 -->
      <div class="page-header">
        <h1>{{ t('dd.title') }}</h1>
        <p class="last-updated">{{ t('dd.lastUpdated') }}: 2025-10-22</p>
      </div>

      <!-- 卡片① 如何删除 / 删除范围 / 时限 -->
      <van-card class="info-card">
        <template #title>
          <div class="card-title">{{ t('dd.how.title') }}</div>
        </template>
        <template #desc>
          <div class="card-content">
            <p>• {{ t('dd.how.self') }}</p>
            <p>• {{ t('dd.how.request') }}</p>
            <p v-html="'• ' + t('dd.how.email')"></p>
          </div>
        </template>
      </van-card>

      <van-card class="info-card">
        <template #title>
          <div class="card-title">{{ t('dd.scope.title') }}</div>
        </template>
        <template #desc>
          <div class="card-content">
            <p>• {{ t('dd.scope.profile') }}</p>
            <p>• {{ t('dd.scope.orders') }}</p>
            <p>• {{ t('dd.scope.audit') }}</p>
          </div>
        </template>
      </van-card>

      <van-card class="info-card">
        <template #title>
          <div class="card-title">{{ t('dd.sla.title') }}</div>
        </template>
        <template #desc>
          <div class="card-content">
            <p>• {{ t('dd.sla.time') }}</p>
            <p>• {{ t('dd.sla.retention') }}</p>
          </div>
        </template>
      </van-card>

      <!-- 卡片② 自助删除（已登录用户可见） -->
      <van-card v-if="isAuthenticated" class="action-card">
        <template #title>
          <div class="card-title">{{ t('dd.self.title') }}</div>
        </template>
        <template #desc>
          <div class="card-content">
            <p>{{ t('dd.self.hint') }}</p>
            <van-button 
              type="danger" 
              block 
              :loading="deleting"
              @click="handleSelfDelete"
              class="delete-btn"
            >
              {{ t('dd.self.btn') }}
            </van-button>
          </div>
        </template>
      </van-card>

      <!-- 卡片③ 未登录用户申请表单 -->
      <van-card class="form-card">
        <template #title>
          <div class="card-title">{{ t('dd.form.title') }}</div>
        </template>
        <template #desc>
          <van-form @submit="handleFormSubmit">
            <van-field
              v-model="formData.channel"
              name="channel"
              :label="t('dd.form.channel')"
              :placeholder="t('dd.form.channel')"
            >
              <template #input>
                <van-radio-group v-model="formData.channel" direction="horizontal">
                  <van-radio name="LINE">LINE</van-radio>
                  <van-radio name="Facebook">Facebook</van-radio>
                  <van-radio name="phone">{{ t('dd.form.phone') }}</van-radio>
                  <van-radio name="guest">{{ t('dd.form.guest') }}</van-radio>
                </van-radio-group>
              </template>
            </van-field>

            <van-field
              v-model="formData.identifier"
              name="identifier"
              :label="t('dd.form.identifier')"
              :placeholder="t('dd.form.identifier')"
              :rules="[{ required: true, message: t('dd.msg.identifierRequired') }]"
            />

            <van-field
              v-model="formData.email"
              name="email"
              type="email"
              :label="t('dd.form.email')"
              :placeholder="t('dd.form.email')"
            />

            <van-field
              v-model="formData.note"
              name="note"
              type="textarea"
              :label="t('dd.form.note')"
              :placeholder="t('dd.form.note')"
              rows="3"
              maxlength="500"
              show-word-limit
            />

            <div class="form-actions">
              <van-button 
                type="primary" 
                block 
                native-type="submit"
                :loading="submitting"
              >
                {{ t('dd.form.submit') }}
              </van-button>
            </div>
          </van-form>
        </template>
      </van-card>

      <!-- 卡片④ 各平台指引 -->
      <van-card class="platform-card">
        <template #title>
          <div class="card-title">{{ t('dd.pf.title') }}</div>
        </template>
        <template #desc>
          <van-collapse v-model="activePlatform" accordion>
            <!-- Facebook / Instagram -->
            <van-collapse-item :title="t('dd.pf.meta.title')" name="meta">
              <div class="platform-content">
                <p>• {{ t('dd.pf.meta.self') }}</p>
                <p>• {{ t('dd.pf.meta.form') }}</p>
                <p>• {{ t('dd.pf.meta.revoke') }}</p>
              </div>
            </van-collapse-item>

            <!-- LINE -->
            <van-collapse-item :title="t('dd.pf.line.title')" name="line">
              <div class="platform-content">
                <p>• {{ t('dd.pf.line.self') }}</p>
                <p>• {{ t('dd.pf.line.form') }}</p>
                <p>• {{ t('dd.pf.line.revoke') }}</p>
              </div>
            </van-collapse-item>

            <!-- TikTok -->
            <van-collapse-item :title="t('dd.pf.tt.title')" name="tiktok">
              <div class="platform-content">
                <p>• {{ t('dd.pf.tt.self') }}</p>
                <p>• {{ t('dd.pf.tt.form') }}</p>
                <p>• {{ t('dd.pf.tt.revoke') }}</p>
              </div>
            </van-collapse-item>
          </van-collapse>
        </template>
      </van-card>

      <!-- 页底 -->
      <div class="footer">
        <van-button 
          type="default" 
          block 
          @click="router.push('/')"
          class="back-btn"
        >
          {{ t('dd.form.back') }}
        </van-button>
        <p class="contact-email">
          {{ t('common.email') }}: <a href="mailto:bencothailand2024@gmail.com">bencothailand2024@gmail.com</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showDialog, showToast } from 'vant'
import HeaderBar from '@/components/HeaderBar.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const deleting = ref(false)
const submitting = ref(false)
const activePlatform = ref([])

// 表单数据
const formData = ref({
  channel: 'LINE',
  identifier: '',
  email: '',
  note: ''
})

// 已登录用户自助删除
const handleSelfDelete = async () => {
  try {
    await showDialog({
      title: t('common.confirm'),
      message: t('dd.msg.confirmDelete'),
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      showCancelButton: true
    })

    deleting.value = true
    
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Delete failed')
    }

    showToast({
      message: t('dd.msg.deleteSuccess'),
      type: 'success',
      duration: 3000
    })

    // 延迟跳转
    setTimeout(() => {
      authStore.logout()
      router.push('/')
    }, 3000)

  } catch (err) {
    if (err.message !== 'cancel') {
      showToast({
        message: t('dd.msg.neterr'),
        type: 'fail'
      })
    }
  } finally {
    deleting.value = false
  }
}

// 未登录用户提交删除申请
const handleFormSubmit = async () => {
  try {
    submitting.value = true

    const res = await fetch('/api/data-deletion-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value)
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Submit failed')
    }

    showToast({
      message: t('dd.msg.ok'),
      type: 'success',
      duration: 3000
    })

    // 清空表单
    formData.value = {
      channel: 'LINE',
      identifier: '',
      email: '',
      note: ''
    }

  } catch (err) {
    showToast({
      message: t('dd.msg.neterr'),
      type: 'fail'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.data-deletion-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

.content {
  padding: 16px;
}

.page-header {
  text-align: center;
  padding: 20px 0;
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
}

.last-updated {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.info-card,
.action-card,
.form-card,
.platform-card {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}

.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  padding: 12px 16px;
  background: #f8f8f8;
}

.card-content {
  padding: 12px 16px;
}

.card-content p {
  margin: 8px 0;
  line-height: 1.6;
  color: #666;
}

.delete-btn {
  margin-top: 16px;
}

.form-actions {
  padding: 16px;
}

.platform-content {
  padding: 12px 0;
}

.platform-content p {
  margin: 8px 0;
  line-height: 1.6;
  color: #666;
}

.footer {
  margin-top: 24px;
  text-align: center;
}

.back-btn {
  margin-bottom: 16px;
}

.contact-email {
  font-size: 14px;
  color: #666;
}

.contact-email a {
  color: #1989fa;
  text-decoration: none;
}
</style>
