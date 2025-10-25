<script setup>
import { onMounted, ref } from 'vue'
import { fetchNotifications, normalizeList } from '@/services/messages'
const list = ref([])
onMounted(async()=>{ try{ const payload = await fetchNotifications({ page: 1 }); const { list: items } = normalizeList(payload); list.value = items }catch{} })
</script>
<template>
  <div style="padding:12px">
    <h3>我的消息</h3>
    <ul>
      <li v-for="m in list" :key="m.id" style="padding:8px 0;border-bottom:1px solid #eee">{{ m.title }}</li>
    </ul>
  </div>
</template>