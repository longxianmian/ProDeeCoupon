<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import { defineComponent, onMounted } from 'vue'

export default defineComponent({
  name: 'App',
  setup() {
    onMounted(() => {
      console.log('🎉 ProDee优惠券系统H5端启动成功！')
      // LIFF初始化已在main.js中统一处理
    })
  },
  mounted() {
    // 保持兼容性
  }
})
</script>

<style>
#app {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>