<script setup>
import { ref, watch } from 'vue'
import { ensureLogin, checkFriendship, openAddFriend } from '@/services/line'
import { track } from '@/utils/track'

const props = defineProps({
  modelValue: Boolean,
  requireFollow: { type:Boolean, default:false },
  followBonus:  { type:Number,  default:0 }
})
const emit = defineEmits(['update:modelValue','proceed'])

const step = ref('login') // login|followAsk
const following = ref(false)
const checking = ref(false)

// 监听弹窗打开，自动开始登录流程
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    step.value = 'login'
    following.value = false
    checking.value = false
    start()
  }
})

function close(){ emit('update:modelValue', false) }

async function start(){
  track('claim_click')
  step.value='login'
  const lg = await ensureLogin(); if(!lg.ok) return
  checking.value = true
  const fs = await checkFriendship(); checking.value = false
  following.value = !!fs.following
  if (props.requireFollow && !following.value) { step.value='followAsk'; return }
  if (!props.requireFollow && !following.value) { step.value='followAsk'; return }
  proceed()
}

function followNow(){ track('follow_click'); openAddFriend(); setTimeout(recheck, 2000) }
async function recheck(){ checking.value=true; const fs=await checkFriendship(); checking.value=false; following.value=!!fs.following; if(following.value) proceed() }
function proceed(){ track('claim_proceed',{following:following.value}); emit('proceed',{following:following.value}); emit('update:modelValue',false) }

</script>

<template>
  <div v-if="modelValue" class="guard">
    <div class="mask" @click="close"></div>
    <div class="panel">
      <template v-if="step==='login'">
        <h3>用 LINE 一键登录</h3>
        <p>登录后即可领取，本操作代表你同意《用户协议》《隐私政策》。</p>
        <div class="row">
          <button class="primary" @click="start">去登录</button>
          <button @click="close">取消</button>
        </div>
      </template>
      <template v-else-if="step==='followAsk'">
        <h3 v-if="requireFollow">关注后才能领取</h3>
        <h3 v-else>建议关注官方账号</h3>
        <p v-if="requireFollow">请先关注我们的 LINE 官方账号，完成后系统将自动发券。</p>
        <p v-else>关注后可接收到店提醒与售后通知（建议）。也可先直接领取。</p>
        <p v-if="followBonus>0">关注加赠 {{followBonus}}฿ 抵扣</p>
        <div class="row">
          <button class="primary" @click="followNow">去关注</button>
          <button v-if="!requireFollow" @click="proceed">先直接领取</button>
          <button @click="close">取消</button>
        </div>
        <div v-if="checking" class="hint">正在检查关注状态…</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.guard{position:fixed;inset:0;z-index:999}
.mask{position:absolute;inset:0;background:rgba(0,0,0,.5)}
.panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:92vw;max-width:420px;background:#fff;border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.2)}
h3{margin:0 0 8px;font-size:18px}
p{margin:6px 0;color:#666;font-size:14px}
.row{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
button{flex:1;border:none;border-radius:10px;padding:10px 12px;background:#f5f5f5}
button.primary{background:#06c755;color:#fff}
.hint{margin-top:8px;font-size:12px;color:#888}
</style>