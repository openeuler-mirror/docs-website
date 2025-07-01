<script setup lang="ts">
import { OResult } from '@opensig/opendesign';

import { useLocale } from '@/composables/useLocale';
import { useAppearance } from '@/stores/common';

import notFoundImage from '@/assets/category/common/404.png';
import notFoundImageDark from '@/assets/category/common/404-dark.png';

const appearanceStore = useAppearance();
const { t } = useLocale();

defineProps({
  description: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <OResult class="result-empty" :description="description || t('common.empty')">
    <template #image>
      <slot name="image">
        <img class="empty-image" alt="empty" :src="appearanceStore.theme === 'dark' ? notFoundImageDark : notFoundImage" />
      </slot>
    </template>
  </OResult>
</template>

<style lang="scss" scoped>
.result-empty {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  --result-image-width: 230px;
  --result-image-height: 200px;
  @include respond-to('<=laptop') {
    --result-image-width: 160px;
    --result-image-height: 140px;
  }
}
</style>
