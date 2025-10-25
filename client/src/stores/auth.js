import { defineStore } from 'pinia'
import { getMe } from '@/services/user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    me: null,           // /api/me 返回
    isStaff: false,     // 是否店员（被授权）
    storeId: null,      // 归属门店 ID
    loading: false,
    lastRefresh: 0      // 缓存时间戳
  }),
  getters: {
    // 判断用户是否已登录（有line_id或id表示已登录）
    isAuthenticated: (state) => !!(state.me?.line_id || state.me?.id),
    // 获取JWT Token（从localStorage）
    token: () => {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('user_token')
      }
      return null
    }
  },
  actions: {
    async refresh(force = false){
      const now = Date.now()
      // 5分钟内的数据直接使用缓存
      if (!force && this.lastRefresh && (now - this.lastRefresh < 300000)) {
        return
      }
      
      this.loading = true
      try{
        const me = await getMe()
        this.me = me || null
        const roles = (me?.roles || me?.role || []).map?.(x=>String(x).toLowerCase()) || []
        const isStaffFlag = !!(me?.isStaff || roles.includes('staff') || roles.includes('clerk') || me?.staff)
        const storeId = me?.storeId || me?.store_id || me?.store?.id || null
        this.isStaff = isStaffFlag && !!storeId
        this.storeId = storeId
        this.lastRefresh = now
      }catch{
        this.me = null; this.isStaff = false; this.storeId = null
      }finally{ this.loading = false }
    },
    logout(){ this.me=null; this.isStaff=false; this.storeId=null }
  }
})