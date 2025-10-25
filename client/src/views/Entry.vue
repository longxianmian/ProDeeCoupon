<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { persistUtmFromUrl } from '@/utils/utm'

const router = useRouter(); const route = useRoute()

onMounted(()=>{
  persistUtmFromUrl()
  const r = route.query.r || '/'
  router.replace(r)
})
</script>
<template><div style="padding:24px; color:#999">Loading…</div></template>