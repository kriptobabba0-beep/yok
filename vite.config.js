import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/gamma': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gamma/, ''),
        secure: true,
      },
      '/api/data': {
        target: 'https://data-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/data/, ''),
        secure: true,
      },
      '/api/clob': {
        target: 'https://clob.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/clob/, ''),
        secure: true,
      },
    },
  },
})
