<template>
  <div></div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(async () => {
  try {
    // 调用后端，返回当前应露出的活动 ID（可按城市/权重/时间筛选）
    // 这里调用 GET /api/campaigns/active
    const res = await fetch('/api/campaigns/active', { credentials: 'include' })
    const data = await res.json()
    if (data?.id) {
      router.replace(`/coupon/${data.id}`)
    } else {
      router.replace({ path: '/', query: { tab: 'home' } })
    }
  } catch {
    router.replace({ path: '/', query: { tab: 'home' } })
  }
})
</script>