<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'App',
  mounted() {
    console.log('🎉 PreDee优惠券系统H5端启动成功！')
  }
})
</script>

<style>
#app {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>