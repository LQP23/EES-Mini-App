import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. Thêm dòng này

export default defineConfig({
  plugins: [react(), tailwindcss()], // 2. Thêm tailwindcss() vào đây
})