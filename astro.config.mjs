// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  build: {
    // Inline CSS under 4KB into <style> tags — reduces HTTP requests for small component styles
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // Target modern ES to enable smaller, faster output
      target: 'es2020',
      // Split motion utilities into a shared chunk when used across multiple entry points
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/src/scripts/motion/')) {
              return 'motion';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@components': '/src/components',
        '@styles': '/src/styles',
        '@scripts': '/src/scripts',
        '@assets': '/src/assets',
        '@layouts': '/src/layouts',
        '@lib': '/src/lib',
      },
    },
  },
});
