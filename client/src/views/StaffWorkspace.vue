<template>
  <div class="staff-workspace">
    <van-nav-bar 
      :title="$t('staff.workspace')"
      left-arrow
      @click-left="$router.back()"
    />
    
    <!-- 未绑定状态：显示绑定表单 -->
    <div v-if="!staffInfo.is_bound" class="binding-container">
      <div class="binding-content">
        <div class="binding-header">
          <van-icon name="manager" size="48" color="#1989fa" />
          <h3>{{ $t('staff.bindingTitle') }}</h3>
          <p>{{ $t('staff.bindingDescription') }}</p>
        </div>
        
        <van-form @submit="handleStaffBinding" @failed="onSubmitFailed">
          <van-cell-group inset>
            <van-field
              v-model="bindingForm.staff_id"
              name="staff_id"
              :label="$t('staff.staffId')"
              :placeholder="$t('staff.staffIdPlaceholder')"
              clearable
              :rules="[{ required: true, message: $t('staff.staffIdRequired') }]"
            />
            
            <van-field
              v-model="bindingForm.store_code"
              name="store_code"
              :label="$t('staff.storeCode')"
              :placeholder="$t('staff.storeCodePlaceholder')"
              clearable
              :rules="[{ required: true, message: $t('staff.storeCodeRequired') }]"
            />
          </van-cell-group>
          
          <div class="binding-actions">
            <van-button
              round
              block
              type="primary"
              native-type="submit"
              :loading="submitting"
              :disabled="!bindingForm.staff_id || !bindingForm.store_code"
            >
              {{ $t('staff.confirmBinding') }}
            </van-button>
          </div>
        </van-form>
        
        <!-- 使用说明 -->
        <div class="binding-instructions">
          <van-notice-bar
            :text="$t('staff.bindingInstructions')"
            left-icon="info-o"
            mode="closeable"
          />
        </div>
      </div>
    </div>
    
    <!-- 已绑定状态：显示工作台 -->
    <div v-else class="workspace-container">
      <div class="staff-welcome">
        <div class="welcome-header">
          <van-icon name="passed" size="32" color="#07c160" />
          <h3>{{ $t('staff.welcome', { name: staffInfo.staff_info?.name || 'Staff' }) }}</h3>
          <p>{{ staffInfo.staff_info?.store_name }}</p>
        </div>
        
        <div class="staff-details">
          <van-cell-group inset>
            <van-cell :title="$t('staff.staffId')" :value="staffInfo.staff_info?.staff_id" />
            <van-cell :title="$t('staff.storeCode')" :value="staffInfo.staff_info?.store_code" />
            <van-cell :title="$t('staff.boundAt')" :value="formatDate(staffInfo.staff_info?.bound_at)" />
          </van-cell-group>
        </div>
      </div>
      
      <div class="workspace-actions">
        <van-cell-group inset>
          <van-cell 
            :title="$t('staff.scanToRedeem')"
            :label="$t('staff.scanToRedeemDesc')"
            icon="scan"
            is-link
            @click="handleScanRedeem"
          />
          <van-cell 
            :title="$t('staff.manualRedeem')"
            :label="$t('staff.manualRedeemDesc')"
            icon="edit"
            is-link
            @click="handleManualRedeem"
          />
          <van-cell 
            :title="$t('staff.redeemHistory')"
            :label="$t('staff.redeemHistoryDesc')"
            icon="orders-o"
            is-link
            @click="handleRedeemHistory"
          />
        </van-cell-group>
      </div>
      
      <!-- 解绑按钮 -->
      <div class="unbinding-section">
        <van-button
          type="warning"
          size="small"
          @click="handleUnbinding"
        >
          {{ $t('staff.unbinding') }}
        </van-button>
      </div>
    </div>
    
    <!-- Loading 状态 -->
    <van-loading v-if="loading" class="loading-overlay">
      {{ $t('common.loading') }}
    </van-loading>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showDialog, showConfirmDialog } from 'vant'
import axios from 'axios'

export default defineComponent({
  name: 'StaffWorkspace',
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    
    // 状态管理
    const loading = ref(true)
    const submitting = ref(false)
    const staffInfo = ref({
      is_bound: false,
      staff_info: null
    })
    
    // 绑定表单
    const bindingForm = ref({
      staff_id: '',
      store_code: ''
    })
    
    // LIFF相关状态
    const liffReady = ref(false)
    const liffError = ref(null)
    
    // 初始化LIFF
    const initLiff = async () => {
      try {
        // 动态导入LIFF SDK
        const liff = (await import('@line/liff')).default
        
        const liffId = import.meta.env.VITE_LINE_LIFF_ID
        if (!liffId) {
          throw new Error('LIFF ID not configured')
        }
        
        await liff.init({ liffId })
        liffReady.value = true
        
        // 如果不在LINE应用中，显示错误
        if (!liff.isInClient()) {
          console.warn('Not running in LINE app, using development mode')
        }
      } catch (error) {
        console.error('LIFF initialization failed:', error)
        liffError.value = error.message
      }
    }
    
    // 获取LINE用户信息和ID Token
    const getLineUserData = async () => {
      try {
        if (!liffReady.value) {
          // 仅在开发模式下回退到模拟数据
          if (import.meta.env.VITE_DEV_MODE === 'true') {
            const mockLineUserId = localStorage.getItem('mock_line_user_id') || 'U' + Date.now()
            localStorage.setItem('mock_line_user_id', mockLineUserId)
            return {
              userId: mockLineUserId,
              displayName: localStorage.getItem('mock_display_name') || 'Line User',
              idToken: null // 开发模式无ID token
            }
          } else {
            // 生产模式必须有LIFF
            showLiffError()
            return null
          }
        }
        
        const liff = (await import('@line/liff')).default
        if (!liff.isLoggedIn()) {
          liff.login()
          return null
        }
        
        const profile = await liff.getProfile()
        const idToken = liff.getIDToken() // 获取ID token进行安全验证
        
        return {
          userId: profile.userId,
          displayName: profile.displayName,
          idToken: idToken
        }
      } catch (error) {
        console.error('Failed to get LINE user data:', error)
        // 回退到模拟数据（仅开发模式）
        if (import.meta.env.VITE_DEV_MODE === 'true') {
          const mockLineUserId = localStorage.getItem('mock_line_user_id') || 'U' + Date.now()
          localStorage.setItem('mock_line_user_id', mockLineUserId)
          return {
            userId: mockLineUserId,
            displayName: localStorage.getItem('mock_display_name') || 'Line User',
            idToken: null
          }
        } else {
          // 生产模式下必须阻止继续
          showLiffError()
          return null
        }
      }
    }
    
    // 向用户显示LIFF错误
    const showLiffError = () => {
      if (liffError.value && !liffReady.value) {
        showDialog({
          title: t('staff.liffError'),
          message: t('staff.liffErrorMessage'),
          confirmButtonText: t('common.confirm')
        })
      }
    }
    
    // 检查绑定状态
    const checkBindingStatus = async () => {
      try {
        loading.value = true
        const userData = await getLineUserData()
        
        if (!userData) {
          // 用户取消登录或获取失败
          showLiffError()
          return
        }
        
        // 检查是否有ID token，如果没有则提示用户重新登录
        if (!userData.idToken) {
          console.warn('No ID token available, user needs to re-login')
          showToast(t('staff.tokenExpired'))
          showLiffError()
          return
        }
        
        const response = await axios.post('/api/admin/staff-binding/status', {
          id_token: userData.idToken
        })
        
        if (response.data.success) {
          staffInfo.value = response.data.data
        }
      } catch (error) {
        console.error('检查绑定状态失败:', error)
        showToast(t('staff.checkStatusError'))
      } finally {
        loading.value = false
      }
    }
    
    // 处理员工绑定
    const handleStaffBinding = async () => {
      try {
        submitting.value = true
        
        const userData = await getLineUserData()
        
        if (!userData) {
          showToast(t('staff.loginRequired'))
          showLiffError()
          return
        }
        
        // 检查是否有ID token，如果没有则提示用户重新登录
        if (!userData.idToken) {
          console.warn('No ID token available, user needs to re-login')
          showToast(t('staff.tokenExpired'))
          showLiffError()
          return
        }
        
        const response = await axios.post('/api/admin/staff-binding/verify', {
          staff_id: bindingForm.value.staff_id,
          store_code: bindingForm.value.store_code,
          id_token: userData.idToken
        })
        
        if (response.data.success) {
          showToast(response.data.message)
          // 重新检查绑定状态
          await checkBindingStatus()
        }
      } catch (error) {
        console.error('员工绑定失败:', error)
        const message = error.response?.data?.message || t('staff.bindingError')
        showToast(message)
      } finally {
        submitting.value = false
      }
    }
    
    // 表单验证失败
    const onSubmitFailed = (errorInfo) => {
      console.log('submit failed', errorInfo)
      showToast(t('staff.formValidationError'))
    }
    
    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      return new Date(dateString).toLocaleString()
    }
    
    // 扫码核销
    const handleScanRedeem = () => {
      showToast(t('common.developmentFeature'))
    }
    
    // 手动核销
    const handleManualRedeem = () => {
      showToast(t('common.developmentFeature'))
    }
    
    // 核销记录
    const handleRedeemHistory = () => {
      showToast(t('common.developmentFeature'))
    }
    
    // 解绑
    const handleUnbinding = async () => {
      try {
        await showConfirmDialog({
          title: t('staff.unbindingConfirm'),
          message: t('staff.unbindingWarning')
        })
        
        showToast(t('common.developmentFeature'))
      } catch {
        // 用户取消
      }
    }
    
    // 组件初始化
    onMounted(async () => {
      // 首先初始化LIFF
      await initLiff()
      
      // 然后检查绑定状态
      await checkBindingStatus()
    })
    
    return {
      loading,
      submitting,
      staffInfo,
      bindingForm,
      liffReady,
      liffError,
      handleStaffBinding,
      onSubmitFailed,
      formatDate,
      handleScanRedeem,
      handleManualRedeem,
      handleRedeemHistory,
      handleUnbinding,
      showLiffError
    }
  }
})
</script>

<style scoped>
.staff-workspace {
  min-height: 100vh;
  background: #f5f5f5;
  position: relative;
}

/* 绑定界面样式 */
.binding-container {
  padding: 20px;
}

.binding-content {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.binding-header {
  text-align: center;
  padding: 40px 20px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.binding-header h3 {
  margin: 16px 0 8px;
  font-size: 20px;
  font-weight: 600;
}

.binding-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.binding-actions {
  padding: 20px;
}

.binding-instructions {
  padding: 0 20px 20px;
}

/* 工作台界面样式 */
.workspace-container {
  padding: 20px;
}

.staff-welcome {
  background: white;
  border-radius: 12px;
  margin-bottom: 20px;
  overflow: hidden;
}

.welcome-header {
  text-align: center;
  padding: 30px 20px 20px;
  background: linear-gradient(135deg, #07c160 0%, #33d375 100%);
  color: white;
}

.welcome-header h3 {
  margin: 12px 0 8px;
  font-size: 18px;
  font-weight: 600;
}

.welcome-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.staff-details {
  padding: 20px;
}

.workspace-actions {
  margin-bottom: 20px;
}

.unbinding-section {
  text-align: center;
  padding: 20px;
}

/* Loading 叠加层 */
.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 999;
}

/* 响应式设计 */
@media (max-width: 375px) {
  .binding-container,
  .workspace-container {
    padding: 16px;
  }
}
</style>