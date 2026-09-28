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
    // 簡轉繁字典（opencc）是只在需要時才載入的獨立檔案
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120000,
  },
}));
