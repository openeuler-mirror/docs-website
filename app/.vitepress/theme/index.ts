import type { App } from 'vue';
import { createPinia } from 'pinia';

import Layout from '@/App.vue';
import NotFound from '@/NotFound.vue';

import '@/assets/style/base.scss';
import 'element-plus/theme-chalk/src/index.scss';
import '@opensig/opendesign/es/index.scss';
import '@/assets/style/theme/default-light.token.css';
import '@/assets/style/theme/dark.token.css';
import '@/assets/style/markdown.scss';
import '@/assets/style/theme/index.scss';
import '@/assets/style/global.scss';
import '@/assets/style/element-plus/index.scss';

import VueDOMPurifyHTML from 'vue-dompurify-html';
import MarkdownTitle from '@/components/markdown/MarkdownTitle.vue';
import MarkdownImage from '@/components/markdown/MarkdownImage.vue';

import '@/shared/analytics';

export default {
  Layout,
  NotFound,
  enhanceApp({ app }: { app: App }) {
    app.use(createPinia());
    app.use(VueDOMPurifyHTML, {
      default: {
        ADD_ATTR: ['target'],
      },
    });

    // 注册组件
    app.component('MarkdownTitle', MarkdownTitle);
    app.component('MarkdownImage', MarkdownImage);
  },
};
