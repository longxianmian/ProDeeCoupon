<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getMyRedemptions, verifyRedemption } from '@/services/staff'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const auth = useAuthStore()

const code = ref('')
const list = ref([])
const page = ref(1)
const loading = ref(false)
const finished = ref(false)
const verifying = ref(false)
const toast = (m)=> alert(m)

async function load(reset=false){
  if(loading.value) return
  loading.value = true
  try{
    if(reset){ page.value=1; list.value=[]; finished.value=false }
    const data = await getMyRedemptions({ storeId: auth.storeId, page: page.value })
    const items = Array.isArray(data?.items)? data.items : []
    if(reset) list.value = items
    else list.value.push(...items)
    finished.value = !data?.nextPage || items.length === 0
    if(!finished.value) page.value++
  }finally{ loading.value=false }
}

async function verify(){
  if(!code.value.trim()){ toast(t('staff.enterCode')||'请输入核销码'); return }
  verifying.value = true
  try{
    // 获取当前员工的用户 ID 作为核销员 ID
    const verifierId = auth.me?.id
    if (!verifierId) {
      toast(t('staff.notLoggedIn')||'请先登录')
      return
    }
    
    const result = await verifyRedemption({ 
      code: code.value.trim(), 
      storeId: auth.storeId,
      verifierId: verifierId  // 传递核销员 ID
    })
    toast(t('staff.redeemSuccess')||'核销成功！')
    code.value = ''
    // 刷新记录
    load(true)
  }catch(e){
    toast(e.message || t('staff.redeemFailed')||'核销失败')
  }finally{ verifying.value=false }
}

onMounted(()=> load(true))
</script>

<template>
  <section class="sm">
    <!-- 手动核销工具 -->
    <div class="card">
      <div class="title">{{ t('staff.redemption') || '核销工具' }}</div>
      
      <!-- 手动输入核销码 -->
      <div class="manual">
        <div class="input-group">
          <input 
            v-model="code" 
            :placeholder="t('staff.enterCodePlaceholder') || '请输入6位核销码'"
            maxlength="6"
            class="code-input"
          />
          <button 
            @click="verify" 
            :disabled="verifying || !code.trim()"
            class="verify-btn"
          >
            {{ verifying ? t('common.loading') : t('staff.verify') || '核销' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 个人核销记录 -->
    <div class="card">
      <div class="title">{{ t('staff.myRedemptions') || '我的核销记录' }}</div>
      
      <div v-if="list.length" class="records">
        <div v-for="item in list" :key="item.id" class="record">
          <div class="record-info">
            <div class="record-title">{{ item.couponTitle || item.title || t('staff.unknownCoupon') }}</div>
            <div class="record-meta">
              <span class="time">{{ item.createdAt || item.redeemTime }}</span>
              <span class="amount">{{ item.amount || '1' }}{{ t('staff.pieces') || '张' }}</span>
            </div>
          </div>
          <div class="record-status success">{{ t('staff.redeemed') || '已核销' }}</div>
        </div>
      </div>

      <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
      <div v-else-if="!list.length" class="empty">{{ t('staff.noRedemptions') || '暂无核销记录' }}</div>
      
      <!-- 加载更多 -->
      <button 
        v-if="!finished && !loading && list.length" 
        @click="load()" 
        class="load-more"
      >
        {{ t('common.loadMore') || '加载更多' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.sm{ padding:12px; display:flex; flex-direction:column; gap:12px }
.card{ background:#fff; border-radius:12px; padding:16px; box-shadow:0 1px 4px rgba(0,0,0,.06) }
.title{ font-weight:800; font-size:16px; margin-bottom:12px }

/* 手动核销工具 */
.manual{ }
.input-group{ display:flex; gap:8px }
.code-input{ 
  flex:1; 
  border:1px solid #e5e7eb; 
  border-radius:8px; 
  padding:12px; 
  font-size:16px; 
  text-align:center; 
  letter-spacing:2px;
}
.verify-btn{ 
  background:#06c755; 
  color:#fff; 
  border:0; 
  border-radius:8px; 
  padding:12px 20px; 
  font-weight:600;
  cursor:pointer;
}
.verify-btn:disabled{ background:#9ca3af; cursor:not-allowed }
.verify-btn:not(:disabled):hover{ background:#05b249 }

/* 核销记录 */
.records{ display:flex; flex-direction:column; gap:8px }
.record{ 
  display:flex; 
  align-items:center; 
  justify-content:space-between; 
  padding:12px; 
  background:#f9fafb; 
  border-radius:8px;
}
.record-info{ flex:1 }
.record-title{ font-weight:600; font-size:14px }
.record-meta{ display:flex; gap:12px; margin-top:4px }
.time{ color:#6b7280; font-size:12px }
.amount{ color:#6b7280; font-size:12px }
.record-status{ 
  background:#dcfce7; 
  color:#16a34a; 
  padding:4px 8px; 
  border-radius:4px; 
  font-size:12px; 
  font-weight:600;
}

.loading,.empty{ text-align:center; color:#9ca3af; padding:16px }
.load-more{ 
  width:100%; 
  background:#f3f4f6; 
  border:0; 
  border-radius:8px; 
  padding:12px; 
  margin-top:12px; 
  cursor:pointer;
}
.load-more:hover{ background:#e5e7eb }
</style>