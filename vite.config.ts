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
        // Separação simples que não quebra React
        manualChunks: {
          // Chart.js separado (é pesado mas independente)
          'charts': ['chart.js', 'react-chartjs-2'],
          // Icons separado
          'icons': ['lucide-react'],
          // Deixar React/ReactDOM juntos no chunk principal
        }
      }
    }
  },
})
