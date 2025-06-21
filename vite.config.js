import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://multi.compracomsegurancaeconfianca.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      },
      '/socket.io': {
        target: 'https://multi.compracomsegurancaeconfianca.com',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})
