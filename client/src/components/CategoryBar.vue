<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CATEGORIES, labelFor } from '@/constants/categories'

const props = defineProps({
  modelValue: { type: String, default: '' } // 选中 slug，'' 表示全部
})
const emit = defineEmits(['update:modelValue'])
const { locale, t } = useI18n()

const hot = computed(()=> CATEGORIES.filter(x=>x.hot))
const more = computed(()=> CATEGORIES.filter(x=>!x.hot))
const showMore = ref(false)

function pick(slug){ emit('update:modelValue', slug) }
function all(){ emit('update:modelValue', '') }
</script>

<template>
  <div class="catbar">
    <button :class="{on: !modelValue}" @click="all()">{{ t('common.all') }}</button>
    <button v-for="c in hot" :key="c.slug" :class="{on: modelValue===c.slug}" @click="pick(c.slug)">
      {{ labelFor(c.slug, locale) }}
    </button>
    <button class="more" @click="showMore=true">{{ t('common.more') }} ▾</button>
  </div>

  <div v-if="showMore" class="mask" @click="showMore=false"></div>
  <aside v-if="showMore" class="sheet">
    <div class="sheet-hd">{{ t('common.allCategories') }}</div>
    <div class="grid">
      <button v-for="c in more" :key="c.slug" :class="{on: modelValue===c.slug}" @click="pick(c.slug); showMore=false">
        {{ labelFor(c.slug, locale) }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.catbar{position:sticky;top:var(--header-h);z-index:18;display:flex;gap:2px;overflow:auto;padding:2px 3px;background:#fff}

.catbar::-webkit-scrollbar{display:none}

/* Category Buttons */
button {
  white-space: nowrap;
  border: none;
  background: transparent;
  border-radius: 0;
  padding: 10px 20px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.25s ease;
  cursor: pointer;
  min-width: fit-content;
  box-shadow: none;
}

button:hover {
  color: #ff6b35;
  background: transparent;
  transform: none;
  box-shadow: none;
}

button.on {
  background: transparent;
  color: #ff6b35;
  font-weight: 600;
  box-shadow: none;
}

button.more {
  margin-left: auto;
  background: transparent;
  color: #9ca3af;
  font-size: 11px;
}

button.more:hover {
  background: transparent;
  color: #ff6b35;
}

/* Modal Overlay */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 30;
  backdrop-filter: blur(4px);
}

/* Bottom Sheet */
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  padding: 6px 5px 8px;
  z-index: 31;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
  max-height: 60vh;
  overflow-y: auto;
}

.sheet::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
}

.sheet-hd {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 5px 0;
  text-align: center;
  letter-spacing: -0.3px;
}

/* Category Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 3px;
}

.grid button {
  border-radius: 16px;
  padding: 14px 12px;
  text-align: center;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 1.5px solid #e5e7eb;
  color: #4b5563;
}

.grid button:hover {
  background: rgba(255, 107, 53, 0.05);
  border-color: #ff6b35;
  color: #ff6b35;
  transform: scale(1.02);
}

.grid button.on {
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 143, 101, 0.1) 100%);
  color: #ff6b35;
  border-color: #ff6b35;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.2);
}
</style>