// client/src/composables/useAudioUnlock.js
import { ref } from 'vue'

let audioCtx = null
let unlocking = false
const unlocked = ref(sessionStorage.getItem('audioUnlocked') === '1')

// 极短静音 MP3，用于覆盖部分内嵌 WebView 的自动播放策略
const SILENT_MP3 =
  'data:audio/mpeg;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAIAAAESAAzMzMzMzMzMzMzMzMzMzMzMzMzZmZmZmZmZmZmZmZmZmZmZmZmZpnMzMzMzMzMzMzMzMzMzMzMzM3d3d3d3d3d3d3d3d3d3d3d3eoAAAAALAMEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

export function useAudioUnlock() {
  async function unlockAudio() {
    if (unlocked.value || unlocking) return true
    unlocking = true
    try {
      // 1) WebAudio 通道解锁
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) {
        if (!audioCtx) audioCtx = new Ctx()
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {})
        }
        const buf = audioCtx.createBuffer(1, 1, 22050)
        const src = audioCtx.createBufferSource()
        src.buffer = buf
        src.connect(audioCtx.destination)
        try { src.start(0) } catch (_) {}
      }
      // 2) <audio> 解锁（兜底）
      try {
        const a = new Audio(SILENT_MP3)
        a.playsInline = true
        a.muted = false
        await a.play().catch(() => {})
        a.pause()
      } catch (_) {}

      // 标记本会话已解锁 + 开声
      unlocked.value = true
      sessionStorage.setItem('audioUnlocked', '1')
      sessionStorage.setItem('videoSoundEnabled', '1')
      return true
    } finally {
      unlocking = false
    }
  }

  return { unlocked, unlockAudio }
}