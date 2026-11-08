import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dibangun dan disajikan di http://localhost/devjourney/ (XAMPP).
// Saat `npm run dev`, request API diteruskan ke Apache XAMPP.
export default defineConfig({
  base: '/devjourney/',
  plugins: [react()],
  server: { proxy: { '/devjourney/api': { target: 'http://localhost', changeOrigin: true } } },
  preview: { proxy: { '/devjourney/api': { target: 'http://localhost', changeOrigin: true } } },
});
