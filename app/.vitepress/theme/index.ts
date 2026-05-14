import type { App } from 'vue';
import { createPinia } from 'pinia';

import Layout from '@/App.vue';
import NotFound from '@/NotFound.vue';

import '@/assets/style/base.scss';
import 'element-plus/theme-chalk/src/index.scss';
import '@opensig/opendesign/es/theme/openeuler/index.scss';
import '@opendesign-plus/components/styles';
import '@opensig/opendesign-token/themes/e.light.token.css';
import '@opensig/opendesign-token/themes/e.dark.token.css';
import '@/assets/style/markdown.scss';
import '@/assets/style/global.scss';
import '@/assets/style/element-plus/index.scss';

import VueDOMPurifyHTML from 'vue-dompurify-html';
import MarkdownTitle from '@/components/markdown/MarkdownTitle.vue';
import MarkdownImage from '@/components/markdown/MarkdownImage.vue';

import { initOpenDesignAnalytics } from '@opendesign-plus/plugins/analytics';
import { BAIDU_HM, COOKIE_KEY_EN } from '@/config/data';
import { removeCustomCookie } from '@/shared/cookie';

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
    app.use(initOpenDesignAnalytics, {
      appKey: 'openEuler',
      service: 'docs',
      request: '/api-dsapi/query/track/openeuler',
      isCookieAgreed() {
        return location.pathname.startsWith('/zh') ? true : document.cookie.includes(`${COOKIE_KEY_EN}=1`);
      },
      onEnable() {
        const hm = document.createElement('script');
        hm.src = BAIDU_HM;
        hm.classList.add('analytics-script');
        const s = document.getElementsByTagName('HEAD')[0];
        s.appendChild(hm);
      },
      onDisable() {
        const scripts = document.querySelectorAll('script.analytics-script');
        scripts.forEach((script) => {
          script.remove();
        });
        const hm = /^hm/i;
        document.cookie
          .split(';')
          .map((c) => c.trim())
          .forEach((c) => {
            const key = decodeURIComponent(c.split('=')[0]);
            if (hm.test(key)) {
              removeCustomCookie(key);
            }
          });
      },
    });

    // 注册组件
    app.component('MarkdownTitle', MarkdownTitle);
    app.component('MarkdownImage', MarkdownImage);
  },
};
