<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import MessageItem from '@/components/MessageItem.vue'
import { fetchNotifications, normalizeList, markAllRead, markRead, removeMessage } from '@/services/messages'
import { useMsgStore } from '@/stores/msg'

const { t } = useI18n()
const store = useMsgStore()

const category = ref('') // ''|system|campaign|coupon|interaction
const page = ref(1)
const list = ref([])
const loading = ref(false)
const finished = ref(false)
const error = ref('')

async function load(reset=false){
  if (loading.value) return
  if (reset){ page.value=1; finished.value=false; list.value=[] }
  if (finished.value) return
  loading.value = true; error.value=''
  try{
    const payload = await fetchNotifications({ page: page.value, category: category.value })
    const { list:items, nextPage } = normalizeList(payload)
    list.value.push(...items)
    if (!nextPage || nextPage<=page.value) finished.value=true
    else page.value = nextPage
    // 同步未读数
    store.refresh().catch(()=>{})
  }catch(e){ error.value = String(e?.message||e||t('msg.loadFailed')) }
  finally{ loading.value = false }
}

function onFilter(k){ category.value=k; load(true) }

async function onOpen(it){
  // 有 deeplink 则跳转
  if (it.deeplink){ try{ window.router?.push?.(it.deeplink) }catch{ location.href = it.deeplink } }
  // 标记已读
  try{ await markRead(it.id); it.read=true; store.dec(1) }catch{}
}
async function onRead(it){ try{ await markRead(it.id); it.read=true; store.dec(1) }catch{} }
async function onRemove(it){ try{ await removeMessage(it.id); list.value = list.value.filter(x=>x.id!==it.id) }catch{} }
async function onAllRead(){ await markAllRead(); list.value.forEach(x=>x.read=true); store.clear() }

onMounted(()=>{ load(true) })
</script>

<template>
  <section class="mc">
    <!-- 筛选条 -->
    <div class="tabs">
      <button :class="{on: category===''}" @click="onFilter('')">{{ t('msg.all') }}</button>
      <button :class="{on: category==='system'}" @click="onFilter('system')">{{ t('msg.system') }}</button>
      <button :class="{on: category==='campaign'}" @click="onFilter('campaign')">{{ t('msg.campaign') }}</button>
      <button :class="{on: category==='coupon'}" @click="onFilter('coupon')">{{ t('msg.coupon') }}</button>
      <button :class="{on: category==='interaction'}" @click="onFilter('interaction')">{{ t('msg.interaction') }}</button>
      <div class="space"/>
      <button class="allread" @click="onAllRead">{{ t('msg.allRead') }}</button>
    </div>

    <!-- 列表 -->
    <div class="list">
      <MessageItem v-for="it in list" :key="it.id" :item="it" @open="onOpen" @read="onRead" @remove="onRemove"/>

      <div v-if="!loading && list.length===0 && !error" class="empty">{{ t('msg.empty') }}</div>
      <div v-if="error" class="err" @click="load()">{{ error }} · {{ t('msg.clickRetry') }}</div>
      <div v-if="loading" class="loading">{{ t('msg.loading') }}</div>
      <button v-if="!finished && !loading" class="more" @click="load()">{{ t('msg.loadMore') }}</button>
      <div v-else class="end">{{ t('msg.noMore') }}</div>
    </div>
  </section>
</template>

<style scoped>
.mc{ padding:8px 12px calc(12px + var(--bottom-nav-h,64px)); }
.tabs{ position:sticky; top:calc(var(--header-h,56px)); background:#fff; display:flex; gap:8px; padding:8px 0; z-index:18; align-items:center }
.tabs button{ border:1px solid #eee; background:#fff; border-radius:999px; padding:6px 10px; font-size:12px }
.tabs button.on{ background:#ffedd5; border-color:#fed7aa; color:#f97316 }
.tabs .space{ flex:1 }
.tabs .allread{ border-color:#d1fae5; background:#ecfdf5; color:#10b981 }
.list{ display:flex; flex-direction:column; gap:10px }
.empty,.err,.loading,.end{ text-align:center; color:#9ca3af; padding:12px 0 }
.more{ width:100%; background:#fff; border:1px solid #eee; border-radius:8px; padding:8px }
</style>