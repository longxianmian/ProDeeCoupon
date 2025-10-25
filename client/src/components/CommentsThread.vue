<script setup>
import { reactive } from 'vue'

const props = defineProps({
  comments: { type: Array, default: () => [] },
  level: { type: Number, default: 0 }
})

const emit = defineEmits(['reply'])

const state = reactive({ replyingTo: null, text: '' })

function submit(parent) {
  if (!state.text.trim()) return
  emit('reply', { parentId: parent?.id ?? null, content: state.text.trim() })
  state.text = ''
  state.replyingTo = null
}
</script>

<template>
  <div class="thread" :style="{ marginLeft: level ? '12px' : '0' }">
    <div v-for="c in comments" :key="c.id" class="c">
      <div class="meta">{{ c.author }} · {{ c.time }}</div>
      <div class="text">{{ c.content }}</div>
      <div class="ops"><a @click="state.replyingTo = c">回复</a></div>
      <div v-if="state.replyingTo?.id===c.id" class="box">
        <input v-model="state.text" placeholder="写下你的回复…" />
        <button @click="submit(c)">发送</button>
      </div>
      <CommentsThread v-if="c.replies?.length" :comments="c.replies" :level="level+1" @reply="emit('reply',$event)" />
    </div>
  </div>
</template>

<style scoped>
.thread{display:grid;gap:10px}
.c{background:#fff;border-radius:10px;padding:10px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.meta{font-size:12px;color:#888;margin-bottom:4px}
.text{font-size:14px;line-height:1.6}
.ops a{font-size:12px;color:#3b82f6;cursor:pointer}
.box{display:flex;gap:8px;margin-top:8px}
.box input{flex:1;padding:6px 8px;border-radius:8px;border:1px solid #eee}
</style>