<template>
  <!-- 简化版本：直接检查activity_id就显示按钮 -->
  <div
    v-if="props.post && props.post.activity_id"
    :class="['cta-wrap', mode === 'video' ? 'video' : 'text']"
  >
    <a class="cta-btn" :href="`/coupon/${props.post.activity_id}`" @click.prevent="go">
      {{ props.post.cta_text || $t('contentCTA.claimNow') }}
    </a>
  </div>
</template>

<script setup>
const props = defineProps({
  post: { type: Object, required: true },
  mode: { type: String, default: 'video' } // 'video' | 'text'
})

function go() {
  const id = props.post?.activity_id
  if (id) {
    window.location.href = `/coupon/${id}`
  }
}
</script>

<style scoped>
.cta-wrap.video { position: absolute; left: 12px; bottom: 150px; z-index: 25; }
.cta-wrap.text { margin: 14px 0 4px; }
.cta-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 36px; padding: 0 14px; border-radius: 999px; font-weight: 700;
  background: #ff6b35; color: #fff; text-decoration: none;
  box-shadow: 0 6px 16px rgba(255,107,53,0.35);
}
</style>