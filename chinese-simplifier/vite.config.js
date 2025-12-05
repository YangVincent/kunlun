import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'aeonneo.com',
      'www.aeonneo.com',
      'cn.aeonneo.com',
      'comprehensiblemandarin.com',
      'www.comprehensiblemandarin.com',
      'localhost',
      '137.184.55.135'
    ]
  }
})
