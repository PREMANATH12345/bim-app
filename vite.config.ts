import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // 👈 set your base path here
  plugins: [react()],
  server: {
    port: 5174,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    
  }
});
