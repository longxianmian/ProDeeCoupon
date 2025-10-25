<template>
  <div class="account-management">
    <el-card class="header-card">
      <div class="header-content">
        <div class="header-left">
          <el-button @click="goBack" style="margin-right: 16px;">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <h2>员工账号管理</h2>
        </div>
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新增员工
        </el-button>
      </div>
    </el-card>

    <el-card class="table-card">
      <el-table :data="accounts" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :size="40">
              {{ row.display_name?.charAt(0) }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="display_name" label="显示名称" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="department" label="部门" min-width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editAccount(row)">编辑</el-button>
            <el-button size="small" type="warning" @click="resetPassword(row)">
              重置密码
            </el-button>
            <el-button size="small" type="danger" @click="deleteAccount(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      @close="resetForm"
    >
      <el-form :model="formData" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="邮箱" prop="email" v-if="!isEdit">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码（至少8位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="显示名称" prop="display_name">
          <el-input v-model="formData.display_name" placeholder="请输入显示名称" />
        </el-form-item>
        <el-form-item label="头像URL" prop="avatar">
          <el-input v-model="formData.avatar" placeholder="请输入头像URL（可选）" />
        </el-form-item>
        <el-form-item label="部门" prop="department">
          <el-input v-model="formData.department" placeholder="请输入部门（可选）" />
        </el-form-item>
        <el-form-item label="状态" prop="is_active" v-if="isEdit">
          <el-switch v-model="formData.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="passwordDialogVisible"
      title="重置密码"
      width="400px"
    >
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef">
        <el-form-item label="新密码" prop="newPassword" label-width="80px">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少8位）"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPasswordReset" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowLeft } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const router = useRouter()

const loading = ref(false)
const accounts = ref([])
const dialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const dialogTitle = ref('新增员工')
const isEdit = ref(false)
const submitting = ref(false)

const formRef = ref(null)
const passwordFormRef = ref(null)

const formData = ref({
  id: null,
  email: '',
  password: '',
  display_name: '',
  avatar: '',
  department: '',
  is_active: true
})

const passwordForm = ref({
  accountId: null,
  newPassword: ''
})

const formRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码长度不能少于8位', trigger: 'blur' }
  ],
  display_name: [
    { required: true, message: '请输入显示名称', trigger: 'blur' }
  ]
}

const passwordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, message: '密码长度不能少于8位', trigger: 'blur' }
  ]
}

const fetchAccounts = async () => {
  loading.value = true
  try {
    const response = await adminApi.getAccounts()
    
    if (response.success) {
      accounts.value = response.data
    }
  } catch (error) {
    console.error('获取账号列表失败:', error)
    ElMessage.error(error.response?.data?.message || '获取账号列表失败')
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  dialogTitle.value = '新增员工'
  dialogVisible.value = true
}

const editAccount = (account) => {
  isEdit.value = true
  dialogTitle.value = '编辑员工'
  formData.value = {
    id: account.id,
    email: account.email,
    display_name: account.display_name,
    avatar: account.avatar || '',
    department: account.department || '',
    is_active: account.is_active
  }
  dialogVisible.value = true
}

const resetPassword = (account) => {
  passwordForm.value = {
    accountId: account.id,
    newPassword: ''
  }
  passwordDialogVisible.value = true
}

const deleteAccount = async (account) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除员工"${account.display_name}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await adminApi.deleteAccount(account.id)

    if (response.success) {
      ElMessage.success('删除成功')
      fetchAccounts()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

const submitForm = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const response = isEdit.value
        ? await adminApi.updateAccount(formData.value.id, formData.value)
        : await adminApi.createAccount(formData.value)

      if (response.success) {
        ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
        dialogVisible.value = false
        fetchAccounts()
      }
    } catch (error) {
      console.error('操作失败:', error)
      ElMessage.error(error.response?.data?.message || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

const submitPasswordReset = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const response = await adminApi.resetAccountPassword(
        passwordForm.value.accountId,
        passwordForm.value.newPassword
      )

      if (response.success) {
        ElMessage.success('密码重置成功')
        passwordDialogVisible.value = false
      }
    } catch (error) {
      console.error('重置密码失败:', error)
      ElMessage.error(error.response?.data?.message || '重置密码失败')
    } finally {
      submitting.value = false
    }
  })
}

const resetForm = () => {
  formData.value = {
    id: null,
    email: '',
    password: '',
    display_name: '',
    avatar: '',
    department: '',
    is_active: true
  }
  formRef.value?.resetFields()
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const goBack = () => {
  router.push('/admin/dashboard')
}

onMounted(() => {
  fetchAccounts()
})
</script>

<style scoped>
.account-management {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.table-card {
  margin-top: 20px;
}
</style>
