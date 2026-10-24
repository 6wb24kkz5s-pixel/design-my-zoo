/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // The site is served from https://<user>.github.io/design-my-zoo/
  base: '/design-my-zoo/',
  build: {
    // Phaser alone is about 1.2 MB minified (about 320 KB gzipped). That is expected.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
