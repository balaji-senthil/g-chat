import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment
  base: '/g-chat/',
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps for production
    minify: 'terser', // Better minification
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          markdown: ['react-markdown'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit
  },
  test: {
    globals: true, // Enables global test functions like describe, it, expect
    environment: 'jsdom', // Simulates a browser-like environment
    setupFiles: './tests/setup.js', // Path to setup file
  },
})
