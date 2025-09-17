<template>
  <div class="admin-login">
    <div class="login-container">
      <div class="login-header">
        <h1>{{ $t('admin.loginTitle') }}</h1>
        <p>{{ $t('admin.loginSubtitle') }}</p>
      </div>
      
      <div class="login-form">
        <el-form ref="formRef" :model="loginForm" :rules="rules" @submit.prevent="handleLogin">
          <el-form-item prop="email">
            <el-input
              v-model="loginForm.email"
              :placeholder="$t('admin.emailPlaceholder')"
              type="email"
              size="large"
              autocomplete="email"
              :prefix-icon="User"
            />
          </el-form-item>
          
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              :placeholder="$t('admin.passwordPlaceholder')"
              size="large"
              autocomplete="current-password"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          
          <div class="login-actions">
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleLogin"
              style="width: 100%"
            >
              {{ loading ? $t('admin.loggingIn') : $t('admin.loginButton') }}
            </el-button>
          </div>
        </el-form>
      </div>
      
      <div class="login-footer">
        <p>PreDee优惠券系统 - 运营后台</p>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

export default defineComponent({
  name: 'AdminLogin',
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    const loading = ref(false)
    const formRef = ref()
    
    const loginForm = reactive({
      email: '',
      password: ''
    })

    // 表单验证规则
    const rules = {
      email: [
        { required: true, message: t('admin.emailRequired'), trigger: 'blur' },
        { type: 'email', message: t('admin.emailInvalid'), trigger: 'blur' }
      ],
      password: [
        { required: true, message: t('admin.passwordRequired'), trigger: 'blur' },
        { min: 6, message: t('admin.passwordMinLength'), trigger: 'blur' }
      ]
    }

    const handleLogin = async () => {
      // 验证表单
      const valid = await formRef.value.validate().catch(() => false)
      if (!valid) return

      loading.value = true
      
      try {
        // 使用修复后的adminApi.login函数，避免认证头冲突
        const response = await adminApi.login({
          email: loginForm.email,
          password: loginForm.password
        })
        
        if (response.success) {
          // 存储管理员token
          localStorage.setItem('admin_token', response.token)
          localStorage.setItem('admin_user', JSON.stringify(response.admin))
          
          // 显示成功提示
          ElMessage.success(t('admin.loginSuccess'))
          
          // 延迟跳转确保状态保存完成
          setTimeout(() => {
            router.push('/admin/dashboard')
          }, 100)
        } else {
          throw new Error(response.message || '登录失败')
        }
      } catch (error) {
        console.error('管理员登录失败:', error)
        
        if (error.response?.status === 401) {
          ElMessage.error(t('admin.loginInvalid'))
        } else if (error.response?.status === 429) {
          ElMessage.error(t('admin.loginTooManyAttempts'))
        } else {
          ElMessage.error(error.response?.data?.message || t('admin.loginError'))
        }
      } finally {
        loading.value = false
      }
    }

    // 检查是否已登录
    const checkExistingLogin = () => {
      const token = localStorage.getItem('admin_token')
      if (token) {
        router.push('/admin/dashboard')
      }
    }

    checkExistingLogin()

    return {
      loginForm,
      loading,
      handleLogin,
      rules,
      formRef,
      User,
      Lock
    }
  }
})
</script>

<style scoped>
.admin-login {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.login-header p {
  color: #666;
  font-size: 14px;
}

.login-form {
  margin-bottom: 30px;
}

.login-actions {
  margin-top: 20px;
}

.login-footer {
  text-align: center;
  color: #999;
  font-size: 12px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .login-container {
    padding: 30px 20px;
    margin: 10px;
  }
  
  .login-header h1 {
    font-size: 24px;
  }
}
</style>