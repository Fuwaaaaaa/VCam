import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    strictPort: false,
    host: '127.0.0.1',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['@mediapipe/face_mesh'],
  },
});
