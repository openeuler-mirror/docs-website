<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { onClickOutside } from '@vueuse/core';
import axios, { type Canceler } from 'axios';
import { OInput, OIcon, ORow, OCol, OLink, OPopup, ODropdownItem, OScroller } from '@opensig/opendesign';

import ContentWrapper from '@/components/ContentWrapper.vue';
import AppFooter from '@/components/AppFooter.vue';
import FloatingButton from '@/components/FloatingButton.vue';
import HomeBannerCard from './components/HomeBannerCard.vue';

import IconSearch from '~icons/app/icon-search.svg';

import { HOME_CONFIG, HOME_CONFIG_EN } from '@/config/dsl';
import { useAppearance, useSearchingStore } from '@/stores/common';
import { getSearchRecommend } from '@/api/api-search';

import { useScreen } from '@/composables/useScreen';
import { useLocale } from '@/composables/useLocale';

import type { SearchRecommendT } from '@/@types/type-search';
import type { HomeBannerItemT } from '@/@types/type-home';
import HomeSectionCard from './components/HomeSectionCard.vue';
import { oaReport } from '@/shared/analytics';

const appearanceStore = useAppearance();
const searchStore = useSearchingStore();
const { lePad, lePadV, isPhone, leLaptop } = useScreen();
const { t, locale } = useLocale();

const config = computed(() => {
  return locale.value === 'zh' ? HOME_CONFIG : HOME_CONFIG_EN;
});

const gap = computed(() => {
  if (lePadV.value) {
    return '12px';
  } else if (lePad.value) {
    return '16px';
  } else if (leLaptop.value) {
    return '24px';
  } else {
    return '32px';
  }
});

// -------------------- 搜索 --------------------
const searchValue = ref('');

const getSearchUrl = (val: string) => {
  return `${import.meta.env.VITE_MAIN_DOMAIN_URL}/${locale.value}/other/search/?q=${val.trim()}&type=docs&version=${searchStore.version}`;
};

const enterSearchDoc = (val: string) => {
  reportSearch(val);
  clearTimeout(timer);
  if (!val.trim()) {
    return;
  }

  if (lastRecommendCanceler) {
    lastRecommendCanceler('cancel');
  }

  window.open(getSearchUrl(val), '_blank');
  showSearchWord.value = false;
};

const onClikHotWord = () => {
  if (lastRecommendCanceler) {
    lastRecommendCanceler('cancel');
  }
  showSearchWord.value = false;
};

const reportSearch = (val: string) => {
  if (!val.trim()) {
    return;
  }
  oaReport('input', {
    keyword: val.trim(),
    lang: locale.value,
    version: searchStore.version,
  }, 'search_docs');
};

// -------------------- 联想关键词 --------------------
let timer: number | NodeJS.Timeout | undefined;
let lastRecommendCanceler: Canceler | null;
const showSearchWord = ref(false);
const recommendData = ref<SearchRecommendT[]>([]);

const queryGetSearchRecommend = async (val: string) => {
  if (lastRecommendCanceler) {
    lastRecommendCanceler('cancel');
  }

  const cancelToken = new axios.CancelToken((canceler) => {
    lastRecommendCanceler = canceler;
  });

  try {
    const res = await getSearchRecommend({ query: val }, cancelToken);
    lastRecommendCanceler = null;
    res.obj.word.forEach((e: SearchRecommendT) => {
      e.keyHtml = e.key.replace(val, `<span class="found">${val}</span>`);
    });

    if (searchValue.value.trim() === val) {
      recommendData.value = res.obj.word;
      showSearchWord.value = recommendData.value.length > 0;
    }
  } catch {
    // nothing
  }
};

const searchRecommendDebounce = (val: string) => {
  clearTimeout(timer);
  timer = setTimeout(() => queryGetSearchRecommend(val), 300);
};

onUnmounted(() => {
  clearTimeout(timer);
  timer = undefined;
});

const onInputValueInput = () => {
  if (searchValue.value.trim()) {
    searchRecommendDebounce(searchValue.value.trim());
  } else {
    recommendData.value = [];
    showSearchWord.value = false;
  }
};

const onClickWordItem = (item: SearchRecommendT) => {
  enterSearchDoc(item.key);
};

const inputRef = ref();
const scrollerRef = ref();
onClickOutside(
  inputRef,
  () => {
    recommendData.value = [];
    showSearchWord.value = false;
  },
  {
    ignore: [scrollerRef],
  }
);

watch(searchValue, () => {
  if (!searchValue.value.trim()) {
    showSearchWord.value = false;
  }
});

// -------------------- banner card --------------------
const bannerCardRatio = computed(() => {
  return (100 / (lePadV.value ? config.value.recommend.columns_mb : config.value.recommend.columns)).toFixed(2);
});

const getBannerCardBg = (item: HomeBannerItemT) => {
  if (isPhone.value) {
    return item[appearanceStore.theme === 'dark' ? 'bg_mb_dark' : 'bg_mb_light'];
  } else {
    return item[appearanceStore.theme === 'dark' ? 'bg_dark' : 'bg_light'];
  }
};
</script>

<template>
  <div class="home" :class="[{ dark: appearanceStore.theme === 'dark' }]">
    <ContentWrapper :vertical-padding="[lePadV ? '24px' : '32px', lePadV ? '24px' : '72px']">
      <!-- banner -->
      <p class="banner-title">{{ t('home.docCenter') }}</p>
      <div class="banner-search">
        <OInput
          ref="inputRef"
          :placeholder="t('home.searchPlaceholder')"
          v-model="searchValue"
          :max-length="100"
          :input-on-outlimit="false"
          clearable
          @keyup.enter="enterSearchDoc(searchValue)"
          @input="onInputValueInput"
          class="search"
        >
          <template #prefix>
            <OIcon><IconSearch /></OIcon>
          </template>
        </OInput>

        <OPopup :target="inputRef" :visible="showSearchWord" trigger="none" position="bottom">
          <OScroller ref="scrollerRef" class="search-scroller" show-type="hover" size="small" disabled-x>
            <ODropdownItem
              v-for="item in recommendData"
              v-dompurify-html="item.keyHtml"
              :key="item.key"
              :style="{
                '--dropdown-item-color-hover': 'var(--o-color-info2)',
                '--dropdown-item-padding': '8px 12px',
                '--dropdown-item-justify': 'start',
              }"
              @click="onClickWordItem(item)"
            />
          </OScroller>
        </OPopup>

        <div class="hot-search">
          <p class="hot-title">{{ t('home.topSearch') }}</p>
          <ORow gap="16px 0" wrap="wrap">
            <OCol flex="0 0 auto" v-for="(item, i) in config.hots" :key="i">
              <OLink color="primary" :href="getSearchUrl(item)" target="_blank" rel="noopener noreferrer" @click="onClikHotWord">{{ item }}</OLink>
            </OCol>
          </ORow>
        </div>
      </div>

      <!-- banner 卡片 -->
      <div class="banner-card">
        <ORow :gap="gap" wrap="wrap">
          <OCol v-for="(item, i) in config.recommend.items" :key="i" :flex="`0 0 ${bannerCardRatio}%`">
            <HomeBannerCard :title="item.title" :desc="item.desc" :bg="getBannerCardBg(item)" :href="item.href" />
          </OCol>
        </ORow>
      </div>

      <!-- 业务场景/工具 -->
      <template v-for="item in config.sections" :key="item.title">
        <p class="main-title">{{ item.title }}</p>
        <div class="business-list" :style="{ 'grid-template-columns': `repeat(${lePadV ? item.columns_mb : item.columns}, 1fr)` }">
          <HomeSectionCard
            v-for="subItem in item.items"
            :key="subItem.title"
            :title="subItem.title"
            :desc="subItem.desc"
            :href="subItem.href"
            :icon="subItem.icon"
            :bg="subItem.bg"
          />
        </div>
      </template>
    </ContentWrapper>

    <FloatingButton />

    <AppFooter :lang="locale" />
  </div>
</template>

<style lang="scss" scoped>
.home {
  background-image: url('@/assets/category/home/home-banner.png');
  background-position: top -80px right 50%;
  background-repeat: no-repeat;
  background-size: 100% auto;

  &.dark {
    background-image: url('@/assets/category/home/home-banner-dark.png');
  }

  @include respond-to('<=laptop') {
    background-position: top -66px right 50%;
  }

  @include respond-to('<=pad') {
    background-image: none;
  }
}

.banner-title {
  color: var(--o-color-info1);
  font-weight: 500;
  @include h1;
}
.banner-search {
  margin-top: 16px;
}
.search {
  width: 660px;
  --input-height: 40px;
  --input-radius: var(--o-radius-xs);
}

.hot-search {
  display: flex;
  align-items: flex-start;
  margin-top: 16px;
  color: var(--o-color-info1);
  @include text1;
}
.hot-title {
  margin-right: 12px;
  flex-shrink: 0;
  color: var(--o-color-info2);
}

.banner-card {
  margin-top: 40px;
}

.main-title {
  color: var(--o-color-info1);
  font-weight: 500;
  margin-top: 40px;
  @include h2;
}

.business-list {
  display: grid;
  gap: 32px;
  margin-top: 24px;

  @include respond-to('laptop') {
    gap: 24px;
  }

  @include respond-to('pad_h') {
    gap: 16px;
  }

  @include respond-to('<=pad_v') {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

.o-card {
  --card-detail-word-break: normal;
}

.search-scroller {
  max-height: 304px;
  padding: 4px;
  border-radius: var(--o-radius-xs);
  background-color: var(--o-color-fill2);

  :deep(.found) {
    color: var(--o-color-primary1);
  }
}

@include respond-to('<=laptop') {
  .banner-search {
    margin-top: 12px;
  }
  .hot-search {
    margin-top: 12px;
  }
  .banner-card {
    margin-top: 24px;
  }

  .main-title {
    margin-top: 24px;
  }
  .business-list {
    margin-top: 16px;
  }
}

@include respond-to('laptop') {
  .content-wrapper {
    --layout-content-padding: 98px;
  }
}

@include respond-to('<=pad') {
  .banner-card {
    margin-top: 16px;
  }

  .main-title {
    margin-top: 16px;
  }
  .business-list {
    margin-top: 12px;
  }
}

@include respond-to('<=pad_v') {
  .search {
    width: 100%;
  }
}

@include respond-to('phone') {
  .search {
    --input-height: 38px;
    --input-padding: 0 12px;
    .o-icon svg {
      width: 16px;
    }
  }

  .hot-search {
    display: none;
  }
}
</style>
