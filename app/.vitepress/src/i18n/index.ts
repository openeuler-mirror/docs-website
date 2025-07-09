import { createI18n } from 'vue-i18n';
import { getCurrentLocale } from '@/utils/locale';

// 公共
import common from './common';
import header from './header';
import footer from './footer';
import cookie from './cookie';
import response from './response';

import docs from './docs';
import feedback from './feedback';
import home from './home';

const messages = {
  zh: {
    // 公共
    common: common.zh,
    header: header.zh,
    footer: footer.zh,
    cookie: cookie.zh,
    response: response.zh,

    // 业务
    docs: docs.zh,
    feedback: feedback.zh,
    home: home.zh,
  },
  en: {
    // 公共
    common: common.en,
    header: header.en,
    footer: footer.en,
    cookie: cookie.en,
    response: response.en,

    // 业务
    docs: docs.en,
    feedback: feedback.en,
    home: home.en,
  },
};

const locale = getCurrentLocale();
const i18n = createI18n({
  globalInjection: true,
  locale,
  legacy: false,
  fallbackLocale: 'zh',
  messages,
});

export default i18n;
