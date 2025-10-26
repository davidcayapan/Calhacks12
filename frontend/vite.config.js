// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 4173,      // or 5174 if you prefer
    strictPort: true,
    // Optional if Live Share relay breaks HMR:
    // hmr: { protocol: 'wss', clientPort: 443 }
  }
})
