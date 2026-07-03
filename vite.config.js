import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  base: './', // Mantido para caminhos relativos no WebView2
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    // Define o diretório de saída
    outDir: 'C:\Users\HP\Desktop\webview back funcional (2)\webview back funcional\bin\Debug\net8.0-windows10.0.26100.0',
    // Opcional: limpa a pasta antes de gerar os arquivos
    emptyOutDir: true,

    // Aumenta o limite para 1000kb para silenciar avisos de bibliotecas 3D como Three.js
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Estratégia de divisão de arquivos (Code Splitting)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Agrupa todas as bibliotecas externas em um arquivo chamado 'vendor'
            return 'vendor';
          }
        },
        // Garante nomes de arquivos mais limpos para o sistema de arquivos local
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})