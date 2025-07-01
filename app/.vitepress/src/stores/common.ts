import { defineStore } from 'pinia';
import { getCustomCookie } from '@/utils/cookie';

// 语言
export const useLangStore = defineStore('lang', {
  state: () => {
    return {
      lang: '',
    };
  },
  actions: {
    setLangStore(val: string) {
      this.lang = val;
    },
  },
});

export const useAppearance = defineStore('appearance', {
  state: () => ({
    theme: 'light' as 'light' | 'dark',
    iconMenuShow: true,
  }),
});

/**
 * 搜索状态
 */
export const useSearchingStore = defineStore('isSearching', {
  state: () => {
    return {
      isSearching: false,
      keyword: '',
      isLoading: false,
      currentPage: 1,
      version: '24.03_LTS_SP2', // 文档当前版本
    };
  },
  actions: {
    setIsSearching(value: boolean) {
      this.isSearching = value;
    },
    setKeyword(value: string) {
      this.keyword = value;
    },
    setIsLoading(value: boolean) {
      this.isLoading = value;
    },
    setCurrentPage(value: number) {
      this.currentPage = value;
    },
  },
});

// cookie状态
export const COOKIE_AGREED_STATUS = {
  NOT_SIGNED: '0', // 未签署
  ALL_AGREED: '1', // 同意所有cookie
  NECCESSARY_AGREED: '2', // 仅同意必要cookie
};

// cookie key
export const COOKIE_KEY = 'agreed-cookiepolicy';

/**
 * cookie版本
 */
export const useCookieStore = defineStore('cookie', {
  state: () => ({
    status: '0',
    isNoticeVisible: false,
  }),
  getters: {
    isAllAgreed: (state) => state.status === '1',
  },
  actions: {
    getUserCookieStatus() {
      const cookieVal = getCustomCookie(COOKIE_KEY) ?? '0';
      const cookieStatusVal = cookieVal[0];
      if (cookieStatusVal === COOKIE_AGREED_STATUS.ALL_AGREED) {
        this.status = COOKIE_AGREED_STATUS.ALL_AGREED;
        return COOKIE_AGREED_STATUS.ALL_AGREED;
      } else if (cookieStatusVal === COOKIE_AGREED_STATUS.NECCESSARY_AGREED) {
        this.status = COOKIE_AGREED_STATUS.NECCESSARY_AGREED;
        return COOKIE_AGREED_STATUS.NECCESSARY_AGREED;
      } else {
        this.status = COOKIE_AGREED_STATUS.NOT_SIGNED;
        return COOKIE_AGREED_STATUS.NOT_SIGNED;
      }
    },
  },
});
