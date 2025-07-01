import { computed, onMounted } from 'vue';
import { useData } from 'vitepress/client';
import { isClient, isUndefined } from '@opensig/opendesign';

import type { LocaleT } from '@/@types/type-locale';

import i18n from '@/i18n';
interface LocaleItemDeatilT {
  [key: string]: string;
}
interface LocaleItemT {
  [key: string]: LocaleItemDeatilT;
}
export const useLocale = () => {
  const { lang } = useData();

  const locale = computed(() => {
    if (lang.value === 'zh' || lang.value === 'en') {
      return lang.value === 'zh' ? 'zh' : 'en';
    } else {
      if (isClient) {
        const { pathname } = window.location;
        if (pathname.startsWith('/zh/')) {
          return 'zh';
        } else if (pathname.startsWith('/en/')) {
          return 'en';
        } else {
          if (localStorage.getItem('locale')) {
            return localStorage.getItem('locale') === 'zh' ? 'zh' : 'en';
          } else {
            return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
          }
        }
      }

      return 'zh';
    }
  });

  const isZh = computed(() => locale.value === 'zh');
  const isEn = computed(() => locale.value === 'en');

  // 语言切换
  const changeLocale = (lang?: LocaleT) => {
    if (locale.value === lang) {
      return;
    }

    const language = isUndefined(lang) ? (isZh.value ? 'en' : 'zh') : lang;
    if (isClient) {
      const { pathname } = window.location;
      const newPathName = pathname.replace(`/${locale.value}/`, `/${language}/`);
      localStorage.setItem('locale', language);
      window.location.pathname = newPathName;
    }
  };

  const t = (val: string, replacements?: string | string[] | number[]) => {
    const [category, key] = val.split('.');
    const info: LocaleItemT = i18n.global.messages.value[locale.value];
    if (info) {
      const item = info[category];
      if (item) {
        let value = item[key];
        if (replacements) {
          if (Array.isArray(replacements)) {
            replacements.forEach((replacement, index) => {
              value = value?.replace(`{${index}}`, String(replacement));
            });
          } else {
            value = value?.replace(`{0}`, replacements);
          }
        }
        return value;
      }
    }
  };

  const $t = t;

  onMounted(() => {
    if (locale.value) {
      localStorage.setItem('locale', locale.value);
    }
  });

  return {
    $t,
    t,
    locale,
    isZh,
    isEn,
    changeLocale,
  };
};
