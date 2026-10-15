import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' para que funcione en GitHub Pages (sergiiosp.github.io/mi-nutricionista/)
export default defineConfig({
  base: './',
  plugins: [svelte()],
  server: { port: 8080 },
  preview: { port: 8080 },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
});
