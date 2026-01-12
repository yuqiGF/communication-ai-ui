import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  // --- 新增 server 配置 ---
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8123', // 后端地址
        changeOrigin: true, // 允许跨域
        // 也就是说，前端请求 /api/ai/AnimeMaster
        // 会被代理到 http://localhost:8123/api/ai/AnimeMaster
      }
    }
  }
})