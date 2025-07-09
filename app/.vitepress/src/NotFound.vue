<script setup lang="ts">
import { OResult, OButton } from '@opensig/opendesign';

import ContentWrapper from '@/components/ContentWrapper.vue';

import { useLocale } from '@/composables/useLocale';
import { useAppearance } from '@/stores/common';

import notFoundImage from '@/assets/category/common/404.png';
import notFoundImageDark from '@/assets/category/common/404-dark.png';

const appearanceStore = useAppearance();
const { t, locale } = useLocale();
</script>

<template>
  <ContentWrapper class="result-404">
    <OResult>
      <template #image>
        <slot name="image">
          <img class="not-found-image" alt="notFound" :src="appearanceStore.theme === 'dark' ? notFoundImageDark : notFoundImage" />
        </slot>
      </template>
      <template #extra>
        <p class="text404">{{ t('common.empty') }}</p>
        <a :href="`/${locale}/`" target="_self" rel="noopener">
          <OButton variant="solid" color="primary">{{ t('common.returnHome') }}</OButton>
        </a>
      </template>
    </OResult>
  </ContentWrapper>
</template>

<style lang="scss" scoped>
.result-404 {
  width: 100%;
  height: var(--layout-content-min-height);
  display: flex;
  justify-content: center;
  align-items: center;
}
.text404 {
  @include text2;
  color: var(--o-color-info1);
  margin-bottom: 24px;
}
</style>
