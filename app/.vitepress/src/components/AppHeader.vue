<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useRouter, useData } from 'vitepress';

import { OHeader, OHeaderMobile, OHeaderSourceCode, OHeaderSearch, OHeaderLanguageSwitcher, OHeaderTheme, OHeaderUser } from '@opendesign-plus/components';
import type { LanguageOptionT, OSearchRecommendItem, OSearchUploadImageFn } from '@opendesign-plus/components';
import { useTheme, getUserAuth } from '@opendesign-plus/composables';
import { useDebounceFn } from '@vueuse/core';

import { setCustomCookie, getCustomCookie } from '@/shared/cookie';

import { login, logout, tryToLogin } from '@/shared/login';
import { useAppearance } from '@/stores/common';
import { useScreen } from '@/composables/useScreen';
import { useLocale } from '@/composables/useLocale';
import { useViewStore } from '@/stores/view';
import { useUserInfoStore } from '@/stores/user';

import { isPageExist } from '@/api/api-common';
import { getUnreadMsgCount } from '@/api/api-message';
import { getPop, getSearchRecommend, getOnestepSearch, imageUpload } from '@/api/api-search';

import logo_light from '@/assets/category/header/logo.svg';
import logo_dark from '@/assets/category/header/logo_dark.svg';
import bgLeft from '@/assets/category/header/nav_background_left.png';
import bgRight from '@/assets/category/header/nav_background_right.png';

const router = useRouter();
const { lang } = useData();
const { t } = useLocale();
const { lePadV, size } = useScreen();
const appearanceStore = useAppearance();
const viewStore = useViewStore();
const { csrfCookie } = getUserAuth();
const userInfoStore = useUserInfoStore();

const isMounted = ref(false);

const goHome = () => {
  window.location.href = `${import.meta.env.VITE_MAIN_DOMAIN_URL}/${lang.value}/`;
};

// 主题切换
const APPEARANCE_KEY = 'openEuler-theme-appearance';
const { theme: opTheme, setTheme } = useTheme();
const currentTheme = computed(() => (opTheme?.value as 'light' | 'dark') ?? appearanceStore.theme);
watch(
  () => opTheme?.value,
  (val) => {
    if (val) {
      appearanceStore.theme = val as 'light' | 'dark';
    }
  }
);

const onChangeTheme = (val: string) => {
  if (setTheme) {
    setTheme(val as 'light' | 'dark');
  }
  appearanceStore.theme = val as 'light' | 'dark';
  setCustomCookie(APPEARANCE_KEY, val, 180, import.meta.env.VITE_COOKIE_DOMAIN);
};

onMounted(() => {
  isMounted.value = true;
  let theme;
  if (!getCustomCookie(APPEARANCE_KEY)) {
    const prefereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefereDark ? 'dark' : 'light';
  } else {
    theme = getCustomCookie(APPEARANCE_KEY);
  }
  appearanceStore.theme = theme === 'dark' ? 'dark' : 'light';
});

// 导航数据
const navData = computed(() => t('header.NAV_ROUTER'));
const logoUrl = computed(() => (appearanceStore.theme === 'light' ? logo_light : logo_dark));
const sourceCode = computed(() => t('header.SOURCE_CODE'));
const searchValue = computed(() => t('header.SEARCH'));

// 语言切换
const langData = ref({});
const langShow = ref(viewStore.isHomeView ? ['zh', 'en', 'ar'] : ['zh', 'en']);
const langOptions: LanguageOptionT[] = [
  { id: 'zh', label: '简体中文', simple: '中' },
  { id: 'en', label: 'English', simple: 'EN' },
  { id: 'ar', label: 'العربية', simple: 'AR' },
];
const langList = ref<LanguageOptionT[]>([]);
const filterLang = () => {
  langList.value = langShow.value.map((id) => langOptions.find((el) => el.id === id)).filter(Boolean) as LanguageOptionT[];
  langData.value = {
    label: t('common.lang'),
    children: langList.value,
  };
};

async function changeLanguage(val: LanguageOptionT) {
  if (val.id === lang.value) return;
  if (val.id === 'ar') {
    window.location.href = 'https://ar.openeuler.org/ar/docs/';
    return;
  }
  const { pathname, search } = window.location;
  const newHref = pathname.replace(`/${lang.value}/`, `/${val.id}/`);

  if (await isPageExist(newHref)) {
    router.go(newHref + search);
  } else {
    window.location.href = `/${val.id}/`;
  }
}

watch(
  () => langShow.value,
  () => {
    filterLang();
  },
  { immediate: true }
);

// 登录
const userInfo = computed(() => ({
  photo: userInfoStore.photo,
  username: userInfoStore.username,
}));

const userOptions = computed(() => [
  {
    id: 'center',
    label: t('header.USER_CENTER'),
    url: `${import.meta.env.VITE_MAIN_DOMAIN_URL}/${lang.value}/my/workspace`,
    target: '_blank',
    total: 0,
    logout: false,
  },
  {
    id: 'message',
    label: t('header.MESSAGE_CENTER'),
    url: import.meta.env.VITE_SERVICE_MESSAGE_CENTER_URL,
    target: '_blank',
    total: unreadMsgCount.value,
    logout: false,
  },
  {
    id: 'logout',
    label: t('header.LOGOUT'),
    url: '',
    target: '_self',
    total: 0,
    logout: true,
  },
]);

const unreadMsgCount = ref(0);
const getMsgCount = async () => {
  try {
    const data = await getUnreadMsgCount();
    unreadMsgCount.value = Object.values(data).reduce((count, val) => count + val, 0);
  } catch {
    // nothing
  }
};

onMounted(async () => {
  await tryToLogin();
  getMsgCount();
});

// 搜索
const searchInput = ref('');
const imageUrl = ref('');
const hotItems = ref<string[]>([]);
const suggestItems = ref<OSearchRecommendItem[]>([]);
const onestepItems = ref<OSearchRecommendItem[]>([]);

const fetchHotItems = () => {
  getPop(`lang=${lang.value}`).then((res) => {
    hotItems.value = res.obj;
  });
};

const fetchSuggestions = useDebounceFn((val: string) => {
  getSearchRecommend({ query: val }).then((res) => {
    suggestItems.value = (res.obj.word || []).map((item: any) => ({
      key: item.key,
      path: item.path?.startsWith(`/${lang.value}`) ? item.path : `/${lang.value}${item.path}`,
      type: item.type,
      count: item.count,
    }));
  });
  getOnestepSearch({ query: val, lang: lang.value }).then((res) => {
    onestepItems.value = (res.obj.word || []).map((item: any) => ({
      key: item.key,
      path: item.path?.startsWith(`/${lang.value}`) ? item.path : `/${lang.value}${item.path}`,
      type: item.type,
      count: item.count,
    }));
  });
}, 300);

watch(
  () => searchInput.value,
  (val) => {
    if (val) {
      fetchSuggestions(val);
    } else {
      suggestItems.value = [];
      onestepItems.value = [];
    }
  }
);

const uploadImageFn: OSearchUploadImageFn = async (file: File) => {
  const res = await imageUpload({ image: file });
  return res.obj;
};

const searchUrl = computed(() => `${import.meta.env.VITE_MAIN_DOMAIN_URL}/${lang.value}/other/search/`);

function onSearch(keyword: string) {
  const input = keyword.keyword?.trim();
  if (!input) return;
  const params = imageUrl.value ? `q=${encodeURIComponent(input)}&imageUrl=${imageUrl.value}` : `q=${encodeURIComponent(input)}`;
  window.open(`${import.meta.env.VITE_MAIN_DOMAIN_URL}/${lang.value}/other/search/?${params}`, '_blank');
}

function onFocus() {
  fetchHotItems();
}

const isUserSimple = ref(false);
const isSearchSimple = ref(false);

type BreakpointsT = { both: number; user: number } | null;

const getBreakpoints = (locale: string, hasCookie: boolean): BreakpointsT => {
  if (locale === 'zh') return hasCookie ? { both: 920, user: 1000 } : null;
  return hasCookie ? { both: 1250, user: 1334 } : { both: 1246, user: 1246 };
};

watch(
  () => [size.width, csrfCookie, lang.value],
  () => {
    const bp = getBreakpoints(lang.value, !!csrfCookie);
    if (!bp) {
      isUserSimple.value = false;
      isSearchSimple.value = false;
      return;
    }
    isSearchSimple.value = size.width < bp.both;
    isUserSimple.value = size.width < bp.user;
  },
  { immediate: true }
);
</script>

<template>
  <OHeader
    v-if="isMounted && !lePadV"
    :logo="logoUrl"
    :nav-data="navData"
    community="openEuler"
    active-index="document"
    :bgLeft="bgLeft"
    :bgRight="bgRight"
    class="header-pc"
    :class="[`header-pc-${lang}`]"
    @go-home="goHome"
  >
    <template #toolbar>
      <div class="header-tool">
        <OHeaderSearch
          v-model="searchInput"
          v-model:image-url="imageUrl"
          :placeholder="searchValue.PLEACHOLDER"
          :expanded-placeholder="searchValue.PLEACHOLDER_EXTEND"
          :image-placeholder="searchValue.PLEACHOLDER_IMAGE"
          :image-upload-tooltip="searchValue.UPLOAD_TOOLTIP"
          :history-items="historyItems"
          :hot-items="hotItems"
          :suggest-items="suggestItems"
          :onestep-items="onestepItems"
          :suggest-title="searchValue.SUGGEST"
          :onestep-title="searchValue.ONESTEP"
          :history-title="searchValue.BROWSEHISTORY"
          :hot-title="searchValue.TOPSEARCH"
          :no-data-text="searchValue.NO_DATA"
          :search-text-mobile="searchValue.TEXT"
          enable-image-search
          :upload-image="uploadImageFn"
          highlight-keyword
          store-history
          :search-url-open-blank="true"
          :search-url="searchUrl"
          :simple="isSearchSimple"
          @search="onSearch"
          @focus="onFocus"
        />
        <!-- 源码 -->
        <OHeaderSourceCode :title="sourceCode.label" :options="sourceCode.children" justify="flex-start" />
        <!-- 语言 -->
        <OHeaderLanguageSwitcher :options="langList" :auto="false" type="common" @change="changeLanguage" />
        <!-- 皮肤 -->
        <OHeaderTheme type="common" :theme="currentTheme" @change="onChangeTheme" />
        <!-- 用户信息 -->
        <div class="login">
          <OHeaderUser
            :token="csrfCookie"
            :noticeTotal="unreadMsgCount"
            :userInfo="userInfo"
            :options="userOptions"
            :custom-size="20"
            :simple="isUserSimple"
            @login="login"
            @logout="logout"
          />
        </div>
      </div>
    </template>
  </OHeader>
  <OHeaderMobile
    v-if="isMounted && lePadV"
    :logo="logoUrl"
    :nav-data="navData"
    :code-data="sourceCode"
    :lang-data="langList.length > 2 ? langData : {}"
    class="header-mb"
    @go-home="goHome"
    @lang-click="changeLanguage"
  >
    <template #toolbar>
      <div class="header-toolbar">
        <OHeaderSearch
          v-model="searchInput"
          v-model:image-url="imageUrl"
          :placeholder="searchValue.PLEACHOLDER"
          :expanded-placeholder="searchValue.PLEACHOLDER_EXTEND"
          :image-placeholder="searchValue.PLEACHOLDER_IMAGE"
          :image-upload-tooltip="searchValue.UPLOAD_TOOLTIP"
          :history-items="historyItems"
          :hot-items="hotItems"
          :suggest-items="suggestItems"
          :onestep-items="onestepItems"
          :suggest-title="searchValue.SUGGEST"
          :onestep-title="searchValue.ONESTEP"
          :history-title="searchValue.BROWSEHISTORY"
          :hot-title="searchValue.TOPSEARCH"
          :no-data-text="searchValue.NO_DATA"
          :search-text-mobile="searchValue.TEXT"
          enable-image-search
          :upload-image="uploadImageFn"
          highlight-keyword
          store-history
          :search-url-open-blank="true"
          :search-url="searchUrl"
          mobile
          @search="onSearch"
          @focus="onFocus"
        />
        <OHeaderUser
          :token="csrfCookie"
          :noticeTotal="unreadMsgCount"
          :userInfo="userInfo"
          :options="userOptions"
          :custom-size="20"
          @login="login"
          @logout="logout"
        />
      </div>
    </template>
    <template #tool>
      <OHeaderLanguageSwitcher v-if="langList.length < 3" :options="langList" :auto="false" type="mobile" @change="changeLanguage" />
      <OHeaderTheme type="mobile" :theme="currentTheme" @change="onChangeTheme" />
    </template>
  </OHeaderMobile>
</template>

<style lang="scss" scoped>
.header-pc {
  --header-tool-gap: 20px;
  @media (min-width: 1201px) and (max-width: 1680px) {
    --header-tool-gap: 16px;
  }
  @include respond('pad_h') {
    --header-tool-gap: 12px;
  }
  .header-tool {
    display: flex;
    align-items: center;
    height: 100%;
    .source-code {
      margin-left: var(--header-tool-gap);
    }
    .header-lang {
      margin-left: var(--header-tool-gap);
    }
    .o-theme-switcher {
      margin-left: var(--header-tool-gap);
    }
    .login {
      height: 100%;
      display: flex;
      align-items: center;
      margin-left: var(--header-tool-gap);
      .o-icon {
        --icon-size: 24px;
      }
    }
  }

  :deep(.openeuler) {
    &.approve-en {
      .item-sub {
        &:nth-of-type(1) {
          width: 25%;
          .content-item {
            width: 100%;
          }
        }
      }
    }
  }
}

:deep(.o-search-panel-hot) {
  .o-search-panel-icon {
    display: none;
  }
}

.header-mb {
  :deep(.header-right) {
    height: 100%;
  }
  .header-toolbar {
    display: flex;
    align-items: center;
    height: 100%;
    .header-user {
      margin-left: 16px;
    }
  }
  .header-tool {
    .mobile-change-language {
      margin-bottom: 24px;
    }
    .o-theme-switcher {
      margin-top: 12px;
    }
  }
}
</style>
