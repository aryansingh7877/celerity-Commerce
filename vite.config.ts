import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: {
    port: 3000,
    host: true,
    watch: {
      ignored: ['**/.agent/**', '**/agent/**', '**/.agents/**', '**/.claude/**', '**/.gemini/**']
    }
  },
  optimizeDeps: {
    entries: ['index.html']
  },
  build: {
    rollupOptions: {
      input: 'index.html'
    }
  }
});
