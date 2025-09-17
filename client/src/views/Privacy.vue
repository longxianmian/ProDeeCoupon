<template>
  <div class="privacy">
    <van-nav-bar 
      title="隐私政策"
      left-arrow
      @click-left="$router.back()"
    />
    
    <div class="content">
      <h2>隐私政策</h2>
      <p>页面开发中...</p>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({ name: 'Privacy' })
</script>

<style scoped>
.privacy { min-height: 100vh; background: #f5f5f5; }
.content { padding: 20px; background: white; margin: 20px; border-radius: 8px; }
</style>