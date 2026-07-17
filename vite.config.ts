/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['.cloudtype.app'],
  },
  server: {
    allowedHosts: ['.cloudtype.app'],
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
