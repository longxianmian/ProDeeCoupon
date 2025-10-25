<template>
  <div class="p-4">
    <el-form :inline="true" :model="q" class="mb-4">
      <el-form-item label="时间">
        <el-date-picker v-model="q.range" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" />
      </el-form-item>
      <el-form-item label="活动">
        <el-select v-model="q.campaignId" clearable filterable placeholder="全部活动" :loading="loadingCampaigns">
          <el-option v-for="c in campaigns" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="渠道来源">
        <el-select v-model="q.channel" clearable placeholder="全部渠道">
          <el-option v-for="c in channels" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadAll">刷新数据</el-button>
      </el-form-item>
    </el-form>

    <!-- KPI -->
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-title">总会话（详情UV）</div>
        <div class="kpi-val">{{ sum.sessions }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-title">总领取数</div>
        <div class="kpi-val">{{ sum.claims }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-title">总核销数</div>
        <div class="kpi-val">{{ sum.redeems }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-title">转化率</div>
        <div class="kpi-val small">详情→领取：{{ rate(sum.claims,sum.sessions) }}%
          <span class="mx-2">|</span>
          领取→核销：{{ rate(sum.redeems,sum.claims) }}%
        </div>
      </div>
    </div>

    <!-- 日趋势（简易表）-->
    <el-table :data="daily" size="small" class="mt-4">
      <el-table-column prop="day" label="日期" width="140" />
      <el-table-column prop="sessions" label="详情UV" width="120" />
      <el-table-column prop="claims" label="领取UV" width="120" />
      <el-table-column prop="redeems" label="核销UV" width="120" />
    </el-table>

    <!-- 渠道分布表 -->
    <el-table :data="overview" size="small" class="mt-4">
      <el-table-column prop="key" label="渠道" width="160">
        <template #default="{row}">{{ labelChannel(row.key) }}</template>
      </el-table-column>
      <el-table-column prop="sessions" label="详情UV" width="120" />
      <el-table-column prop="claims" label="领取UV" width="120" />
      <el-table-column prop="redeems" label="核销UV" width="120" />
      <el-table-column label="详情→领取%" width="140">
        <template #default="{row}">{{ rate(row.claims,row.sessions) }}%</template>
      </el-table-column>
      <el-table-column label="领取→核销%" width="140">
        <template #default="{row}">{{ rate(row.redeems,row.claims) }}%</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const channels = [
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'instagram', label: 'IG' },
  { value: 'line',      label: 'LINE' },
]

const q = ref({
  range: [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()],
  campaignId: '',
  channel: '',
})

const campaigns = ref([])
const loadingCampaigns = ref(false)
const overview = ref([])
const daily = ref([])
const sum = ref({ sessions: 0, claims: 0, redeems: 0 })

function rate(a, b) { 
  return b ? Number(((a * 100) / b).toFixed(2)) : 0 
}

function labelChannel(v) {
  const f = channels.find(c => c.value === v); 
  return f ? f.label : (v || '-')
}

async function api(path, params = {}) {
  const url = new URL(path, location.origin)
  Object.entries(params).forEach(([k, v]) => (v !== '' && v != null) && url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString()); 
  return res.json()
}

async function loadCampaigns() {
  loadingCampaigns.value = true
  try {
    const res = await api('/api/admin/analytics/dicts/campaigns')
    campaigns.value = (res.campaigns || []).map((x) => ({ id: x.id, name: x.name || x.id }))
  } catch (error) {
    console.error('加载活动列表失败:', error)
  } finally { 
    loadingCampaigns.value = false 
  }
}

async function loadAll() {
  try {
    const [from, to] = q.value.range
    const p = {
      from: from.toISOString(),
      to: to.toISOString(),
      campaign_id: q.value.campaignId || undefined,
      channel: q.value.channel || undefined,
    }
    
    overview.value = await api('/api/admin/analytics/overview', { ...p, groupBy: 'channel' })
    daily.value = await api('/api/admin/analytics/daily', p)

    sum.value.sessions = overview.value.reduce((s, r) => s + Number(r.sessions || 0), 0)
    sum.value.claims = overview.value.reduce((s, r) => s + Number(r.claims || 0), 0)
    sum.value.redeems = overview.value.reduce((s, r) => s + Number(r.redeems || 0), 0)

    await nextTick()
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

onMounted(async () => { 
  await loadCampaigns(); 
  await loadAll() 
})
</script>

<style scoped>
.kpi-grid { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 12px; 
}
.kpi { 
  background: #fff; 
  border-radius: 8px; 
  padding: 12px; 
  border: 1px solid #f0f0f0; 
}
.kpi-title { 
  font-size: 12px; 
  color: #888; 
}
.kpi-val { 
  font-size: 22px; 
  font-weight: 600; 
}
.kpi-val.small { 
  font-size: 14px; 
  font-weight: 500; 
}
.mt-4 { 
  margin-top: 16px; 
}
.mb-4 { 
  margin-bottom: 16px; 
}
.mx-2 { 
  margin: 0 8px; 
}
.p-4 { 
  padding: 16px; 
}
</style>