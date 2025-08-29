import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  build: {
    target: 'es5'   // force un code vieux compatible Safari 9
  },
  plugins: [
    legacy({
      targets: ['iOS >= 9', 'Safari >= 9'],
      additionalLegacyPolyfills: [
        'regenerator-runtime/runtime',
        'whatwg-fetch',
        'core-js/features/url',
        'core-js/features/url-search-params'
      ]
    }),
    vue(), tailwindcss()
  ],
    server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://127.0.0.1:3001",
        changeOrigin: true
      }
    }
  }
})
