import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        spectator: resolve(__dirname, 'spectator.html'),
        play:      resolve(__dirname, 'play.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
