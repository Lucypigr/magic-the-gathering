import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` 產生一般靜態網站；`npm run build:single` 產生單一 HTML 檔（可直接雙擊開啟）。
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    // 單檔版不複製 public/（卡圖改用 build:offline 內嵌）
    copyPublicDir: mode !== 'single',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120000,
  },
}));
