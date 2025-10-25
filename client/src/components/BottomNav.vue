<script setup>
import { useI18n } from 'vue-i18n'

const props = defineProps({ modelValue: { type:String, default:'home' }, unread: { type:Object, default:()=>({ msg:0 }) }, variant: { type:String, default:'user' } })
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

function go(k){ emit('update:modelValue', k) }
</script>

<template>
  <nav class="bn" :class="{ 'staff-nav': variant==='staff' }">
    <template v-if="variant==='staff'">
      <button :class="{on: modelValue==='s-acts'}" @click="go('s-acts')">{{ t('snav.activities')||'活动' }}</button>
      <button :class="{on: modelValue==='s-store'}" @click="go('s-store')">{{ t('snav.store')||'门店' }}</button>
      <button :class="{on: modelValue==='s-me'}" @click="go('s-me')">{{ t('snav.me')||'我的' }}</button>
    </template>
    <template v-else>
      <button :class="{on: modelValue==='home'}" @click="go('home')">{{ t('nav.home') }}</button>
      <button :class="{on: modelValue==='rewards'}"  @click="go('rewards')">{{ t('nav.mall') }}</button>
      <button :class="{on: modelValue==='msg'}"  @click="go('msg')">
        {{ t('nav.messages') }}
        <span v-if="(unread?.msg||0) > 0" class="badge">{{ unread.msg>99? '99+' : unread.msg }}</span>
      </button>
      <button :class="{on: modelValue==='me'}"   @click="go('me')">{{ t('nav.profile') }}</button>
    </template>
  </nav>
</template>

<style scoped>
.bn{position:fixed;left:0;right:0;bottom:0;height:var(--bottom-nav-h);background:#fff;display:grid;grid-template-columns:repeat(4,1fr);box-shadow:0 -1px 6px rgba(0,0,0,.06);z-index:22}
.bn.staff-nav{grid-template-columns:repeat(3,1fr)}
.bn button{border:0;background:transparent;font-size:13px;line-height:1.2;position:relative;display:flex;align-items:center;justify-content:center}
.bn button.on{color:#ff6a00;font-weight:600}
.badge{ position:absolute; top:4px; right:18px; min-width:18px; height:18px; padding:0 4px; border-radius:999px; background:#ef4444; color:#fff; font-size:10px; display:inline-flex; align-items:center; justify-content:center }
</style>