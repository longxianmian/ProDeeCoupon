<template>
  <div class="admin">
    <van-nav-bar 
      :title="$t('nav.admin')"
      left-arrow
      @click-left="$router.back()"
    />
    
    <div class="demo-content">
      <div class="admin-menu">
        <h3>运营后台 (开发中)</h3>
        
        <van-cell-group>
          <van-cell title="门店管理" is-link />
          <van-cell title="活动管理" is-link />
          <van-cell title="核销管理" is-link />
          <van-cell title="数据统计" is-link />
          <van-cell title="用户管理" is-link />
        </van-cell-group>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Admin'
})
</script>

<style scoped>
.admin {
  min-height: 100vh;
  background: #f5f5f5;
}

.demo-content {
  padding: 20px;
}

.admin-menu {
  background: white;
  padding: 20px;
  border-radius: 8px;
}
</style>