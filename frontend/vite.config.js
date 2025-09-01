import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(), tailwindcss()
  ],
    server: {
    proxy: {
      "/api": {
        target: "http://192.168.1.89:3001",
        changeOrigin: true
      }
    }
  }
})
