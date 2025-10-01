import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000, // Reduzir alertas de chunk size
    rollupOptions: {
      output: {
        // Separar dependências grandes em chunks próprios
        manualChunks: (id) => {
          // React ecosystem
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }

          // Chart.js (pesado)
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) {
            return 'charts';
          }

          // Lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }

          // Tailwind CSS (separado em chunk próprio)
          if (id.includes('tailwind') || id.includes('@tailwindcss')) {
            return 'tailwind-vendor';
          }

          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'router';
          }

          // Outras dependências grandes do node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },

        // Nomear chunks de forma consistente
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'css/[name]-[hash][extname]'
      }
    }
  },
})
