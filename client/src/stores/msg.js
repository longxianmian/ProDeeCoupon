import { defineStore } from 'pinia'
import { getUnreadCount } from '@/services/messages'

export const useMsgStore = defineStore('msg', {
  state: () => ({ 
    unread: 0,
    lastRefresh: 0 // 缓存时间戳
  }),
  actions: {
    async refresh(force = false){
      const now = Date.now()
      // 2分钟内的数据直接使用缓存
      if (!force && this.lastRefresh && (now - this.lastRefresh < 120000)) {
        return
      }
      try { 
        this.unread = await getUnreadCount()
        this.lastRefresh = now
      } catch { 
        this.unread = 0 
      }
    },
    dec(n=1){ this.unread = Math.max(0, this.unread - (n||1)) },
    clear(){ this.unread = 0 }
  }
})