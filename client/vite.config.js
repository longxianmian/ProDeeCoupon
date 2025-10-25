import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // 注入环境变量（从 Replit Secrets）
  define: {
    // 从环境变量注入 Facebook App ID
    'import.meta.env.VITE_FB_APP_ID': JSON.stringify(process.env.FB_APP_ID || process.env.VITE_FB_APP_ID || ''),
    'import.meta.env.VITE_FB_LOGIN_ENABLED': JSON.stringify(process.env.FB_LOGIN_ENABLED || process.env.VITE_FB_LOGIN_ENABLED || 'true'),
  }
})
