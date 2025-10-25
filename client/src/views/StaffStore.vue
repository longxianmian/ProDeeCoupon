<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getStoreMetrics } from '@/services/staff'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const auth = useAuthStore()
const loading = ref(true)
const metrics = ref({ today:0, week:0, total:0 })

const storeName = computed(()=> auth.me?.store?.name || auth.me?.storeName || t('staff.unknownStore'))

async function load(){
  if(!auth.storeId){ loading.value=false; return }
  try{
    const [today,week,total] = await Promise.all([
      getStoreMetrics(auth.storeId,'today'),
      getStoreMetrics(auth.storeId,'week'),
      getStoreMetrics(auth.storeId,'total')
    ])
    metrics.value = { today: today?.count||0, week: week?.count||0, total: total?.count||0 }
  }finally{ loading.value=false }
}

onMounted(load)
</script>

<template>
  <section class="ss">
    <div class="card head">
      <div class="title">{{ storeName }}</div>
      <div class="sub">{{ t('staff.storeOverview') }}</div>
    </div>

    <div class="grid">
      <div class="kpi"><div class="num">{{ metrics.today }}</div><div class="lbl">{{ t('staff.today') }}</div></div>
      <div class="kpi"><div class="num">{{ metrics.week }}</div><div class="lbl">{{ t('staff.week') }}</div></div>
      <div class="kpi"><div class="num">{{ metrics.total }}</div><div class="lbl">{{ t('staff.total') }}</div></div>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
  </section>
</template>

<style scoped>
.ss{ padding:12px }
.card.head{ background:#fff; border-radius:12px; padding:12px; box-shadow:0 1px 4px rgba(0,0,0,.06) }
.title{ font-weight:800; font-size:16px }
.sub{ color:#6b7280; font-size:12px }
.grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:12px }
.kpi{ background:#fff; border-radius:12px; padding:10px; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,.06) }
.num{ font-weight:800; font-size:18px }
.lbl{ color:#6b7280; font-size:12px }
.loading{ text-align:center; color:#9ca3af; padding:16px }
</style>