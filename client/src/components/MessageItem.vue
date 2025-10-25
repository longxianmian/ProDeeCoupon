<script setup>
const props = defineProps({ item: { type:Object, required:true } })
const emit = defineEmits(['open','read','remove'])
</script>

<template>
  <div class="item" :class="{ unread: !item.read }" @click="emit('open', item)">
    <img v-if="item.thumb" class="thumb" :src="item.thumb" alt="" loading="lazy"/>
    <div class="main">
      <div class="title">{{ item.title }}</div>
      <div class="body">{{ item.body }}</div>
      <div class="meta">
        <span class="type">#{{ item.type }}</span>
        <span class="time">{{ item.time }}</span>
      </div>
    </div>
    <div class="ops" @click.stop>
      <button class="op" @click="emit('read', item)">已读</button>
      <button class="op danger" @click="emit('remove', item)">删除</button>
    </div>
  </div>
</template>

<style scoped>
.item{ display:flex; gap:10px; background:#fff; padding:12px; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,.06) }
.item.unread{ background:#fff8f2 }
.thumb{ width:56px; height:56px; border-radius:8px; object-fit:cover; background:#f3f4f6 }
.main{ flex:1; min-width:0 }
.title{ font-weight:700; font-size:14px; margin-bottom:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.body{ color:#6b7280; font-size:12px; line-height:1.4; max-height:2.8em; overflow:hidden }
.meta{ margin-top:6px; font-size:11px; color:#9ca3af; display:flex; gap:8px }
.ops{ display:flex; flex-direction:column; gap:6px }
.op{ border:1px solid #eee; background:#fff; border-radius:8px; padding:4px 6px; font-size:12px }
.op.danger{ color:#ef4444; border-color:#fecaca }
</style>