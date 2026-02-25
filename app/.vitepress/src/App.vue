<script setup lang="ts">
import { inBrowser, useData, useRoute, useRouter } from 'vitepress';
import { nextTick, ref, watch } from 'vue';

import { OScroller, OConfigProvider } from '@opensig/opendesign';
import { OCookieNotice, OPlusConfigProvider } from '@opendesign-plus/components';
import zhCN from '@opensig/opendesign/es/locale/lang/zh-cn';
import enUS from '@opensig/opendesign/es/locale/lang/en-us';

import AppHeader from '@/components/header/AppHeader.vue';
import LayoutDoc from '@/layouts/LayoutDoc.vue';

import { scrollToTop } from '@/utils/common';
import { useLocale } from '@/composables/useLocale';
import { useViewStore } from '@/stores/view';

const { lang } = useData();
const { isZh } = useLocale();
const viewStore = useViewStore();

const router = useRouter();
router.onBeforePageLoad = () => {
  viewStore.isScrolling = true;
  scrollToTop(0, false, true);
  viewStore.isScrolling = false;
};

const cookieNoticeVisible = ref(false);
const HOME_URL = import.meta.env.VITE_MAIN_DOMAIN_URL;
const COOKIE_DOMAIN = import.meta.env.VITE_COOKIE_DOMAIN;
const route = useRoute();
const cookieRef = ref();
watch(
  () => route.path,
  async () => {
    await nextTick();
    cookieRef.value?.check();
  }
);

// ============埋点============
const currentHref = ref('');
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const route = useRoute();
  watch(
    () => route.path,
    () => {
      currentHref.value = location.href;
    },
    { immediate: true, flush: 'post' }
  );
}

if (inBrowser) {
  document.addEventListener('click', (event) => {
    if (!(window as any).__OA_INSTANCE__?.enabled) return;
    // 获取点击的目标元素
    let target = event.target as HTMLElement;
    // 向上查找最近的 <a> 标签（处理嵌套元素点击）
    while (target && target.tagName !== 'A') {
      target = target.parentElement as HTMLElement;
      if (!target) return; // 非链接元素直接退出
    }
    if (target.parentElement?.classList.contains('chapter-item')) {
      return;
    }
    const href = (target as HTMLAnchorElement).href;
    if (href.startsWith('javascript:')) return;

    const data = {
      $url: currentHref.value,
      target: href,
      content: target.textContent!.trim(),
      type: 'link',
    };

    if (/\/(zh|en)\/$/.test(currentHref.value)) {
      data.type = 'homePage';
    } else if (target.classList.contains('o-breadcrumb-item-label')) {
      data.type = 'breadcrumb';
    } else if (target.parentElement?.classList.contains('doc-footer-content')) {
      data.type = 'pageChange';
    }

    (window as any).__OA_REPORT__?.('click', data, 'docs');
  });
}
</script>

<template>
  <OConfigProvider :locale="isZh ? zhCN : enUS">
    <AppHeader class="ly-header" />
    <OScroller show-type="hover" disabled-x auto-update-on-scroll-size>
      <main class="ly-main">
        <Content v-if="viewStore.isHomeView || viewStore.isCustomView" />
        <LayoutDoc v-else />
      </main>
    </OScroller>
    <OPlusConfigProvider :locale="lang">
      <OCookieNotice ref="cookieRef" v-model:visible="cookieNoticeVisible" community="openEuler" :detail-url="`${HOME_URL}/${lang}/other/cookies/`" :cookie-domain="COOKIE_DOMAIN" />
    </OPlusConfigProvider>
  </OConfigProvider>
</template>

<style lang="scss">
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--o-color-fill1);
  color: var(--o-color-info1);

  --vw100: 100vw;

  --layout-header-height: 80px;
  --layout-header-zIndex: 101;
  --layout-header-max-width: 1488px;
  --layout-header-padding: 12px;

  --layout-content-max-width: 1488px;
  --layout-content-padding: 10px;

  --layout-doc-padding-top: 32px;
  --layout-doc-padding-bottom: 72px;

  --layout-footer-height: 474px;

  --layout-screen-height: 100vh;

  --layout-content-min-height: calc(var(--layout-screen-height) - var(--layout-header-height));

  @include respond-to('<=laptop') {
    --layout-header-max-width: 100%;
    --layout-header-padding: 5%;

    --layout-content-max-width: 100%;
    --layout-content-padding: 5%;

    --layout-footer-height: 438px;
  }

  @include respond-to('<=pad') {
    --layout-header-padding: 32px;

    --layout-content-padding: 32px;

    --layout-footer-height: 434px;
  }

  @include respond-to('<=pad_v') {
    --layout-header-height: 48px;
  }

  @include respond-to('phone') {
    --layout-header-padding: 24px;

    --layout-content-padding: 24px;

    --layout-doc-padding-bottom: 24px;
  }
}
</style>

<style lang="scss" scoped>
.o-scroller {
  height: var(--layout-screen-height);
  background-color: var(--o-color-fill1);
  --scrollbar-height: calc(var(--layout-screen-height) - var(--layout-header-height) * 2 - 10px);
  :deep(.o-scroller-container) {
    scroll-padding-top: var(--layout-header-height);
  }
}
.ly-main {
  //min-height: calc(var(--layout-content-min-height) + var(--layout-header-height));
  background-color: var(--o-color-fill1);
  padding-top: var(--layout-header-height);
}
</style>
