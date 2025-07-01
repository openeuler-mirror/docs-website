import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitepress';
import Icons from 'unplugin-icons/vite';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    Icons({
      compiler: 'vue3',
      customCollections: {
        app: FileSystemIconLoader(fileURLToPath(new URL('./.vitepress/src/assets/svg-icons', import.meta.url))),
        home: FileSystemIconLoader(fileURLToPath(new URL('./.vitepress/src/assets/category/home/svg-icons', import.meta.url))),
        footer: FileSystemIconLoader(fileURLToPath(new URL('./.vitepress/src/assets/category/footer/svg-icons', import.meta.url))),
        feedback: FileSystemIconLoader(fileURLToPath(new URL('./.vitepress/src/assets/category/feedback/svg-icons', import.meta.url))),
      },
    }),
    // basicSsl(),
  ],
  assetsInclude: ['**/*.PNG'],
  build: {
    outDir: fileURLToPath(new URL('./.vitepress/dist', import.meta.url)),
    cssCodeSplit: true,
  },
  publicDir: fileURLToPath(new URL('./.vitepress/public', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./.vitepress/src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        charset: false,
        additionalData: `
          @use "@/assets/style/element-plus/var.scss" as *;
          @use "@/assets/style/mixin/screen.scss" as *;
          @use "@/assets/style/mixin/font.scss" as *;
          @use "@/assets/style/mixin/common.scss" as *;
        `,
      },
    },
  },
  ssr: {
    noExternal: ['@agconnect/api', '@agconnect/instance', '@hw-hmscore/analytics-web'],
  },
  server: {},
});
