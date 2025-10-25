<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getStoreActivities } from '@/services/staff'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const auth = useAuthStore()
const list = ref([])
const loading = ref(true)

async function load(){
  loading.value=true
  try{
    const data = await getStoreActivities(auth.storeId)
    const items = Array.isArray(data?.items)? data.items : Array.isArray(data)? data : []
    list.value = items.map(x=>({
      id: x.id,
      title: x.title || x.name,
      thumb: x.cover || x.thumbnail || x.poster || x.image,
      sop: x.sop || x.instructions || x.guide || '',
      notes: x.notes || x.attention || ''
    }))
  }finally{ loading.value=false }
}

onMounted(load)
</script>

<template>
  <section class="sa">
    <div v-for="it in list" :key="it.id" class="card">
      <div class="row">
        <img v-if="it.thumb" :src="it.thumb" class="thumb" alt=""/>
        <div class="meta">
          <div class="title">{{ it.title }}</div>
          <div class="sublbl">{{ t('staff.activity') }}</div>
        </div>
      </div>
      <div v-if="it.sop" class="block"><div class="lbl">{{ t('staff.sop') }}</div><div class="txt">{{ it.sop }}</div></div>
      <div v-if="it.notes" class="block"><div class="lbl">{{ t('staff.notes') }}</div><div class="txt">{{ it.notes }}</div></div>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="!list.length" class="empty">{{ t('common.empty') }}</div>
  </section>
</template>

<style scoped>
.sa{ padding:12px; display:flex; flex-direction:column; gap:10px }
.card{ background:#fff; border-radius:12px; padding:12px; box-shadow:0 1px 4px rgba(0,0,0,.06) }
.row{ display:flex; gap:10px; align-items:center }
.thumb{ width:56px; height:56px; border-radius:8px; object-fit:cover; background:#f3f4f6 }
.meta{ flex:1 }
.title{ font-weight:700 }
.sublbl{ color:#9ca3af; font-size:12px }
.block{ margin-top:8px }
.lbl{ font-weight:700; font-size:12px; color:#6b7280; margin-bottom:4px }
.txt{ white-space:pre-wrap; line-height:1.5; font-size:13px }
.loading,.empty{ text-align:center; color:#9ca3af; padding:16px }
</style>