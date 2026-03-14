import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), solidPlugin()],
  // base is set to './' for GitHub Pages compatibility
  // Set to '/<repo-name>/' if deploying to a subdirectory e.g. '/contractchat/'
  base: './',
  build: {
    outDir: 'dist',
    target: 'esnext'
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
