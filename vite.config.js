import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, '../attached_assets')
    }
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/products': 'http://localhost:8000',
      '/sales': 'http://localhost:8000',
      '/reports': 'http://localhost:8000',
      '/billing': 'http://localhost:8000',
      '/stripe': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/plan': 'http://localhost:8000',
      '/alerts': 'http://localhost:8000',
      '/audit-logs': 'http://localhost:8000',
    }
  }
})

