<script setup lang="ts">
import { useDownload } from '@/stores/download';
import { getSearchUrlParams } from '@/utils/common';

import { useLocale } from '@/composables/useLocale';

const { locale } = useLocale();

const props = defineProps({
  url: {
    type: String,
    required: true,
    default() {
      return '';
    },
  },
});

const downloadStore = useDownload();

const isExternal = () => {
  return props.url.startsWith('https');
};

const emits = defineEmits(['link-click']);

const linkClick = () => {
  emits('link-click');
  // 解决下载tag 高亮问题
  if (props.url.startsWith('/download/')) {
    getDownloadQuery(props.url);
  }
  window.open(`${import.meta.env.VITE_MAIN_DOMAIN_URL}/${locale.value}${props.url}`);
};

const getDownloadQuery = (url: string) => {
  const scenario = getSearchUrlParams(`${window.location.origin}${url}`).get('scenario');
  if (scenario) {
    downloadStore.setScenario(scenario);
    downloadStore.setVersion(url.split('#').at(-1) || '');
  }
};
</script>

<template>
  <a v-if="isExternal()" :href="url" target="_blank" class="link" rel="noopener noreferrer">
    <slot></slot>
  </a>
  <div v-else @click="linkClick" class="link" :class="{ 'without-url': !url }">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.link {
  color: var(--o-color-info1);
  display: flex;
  align-items: center;

  @include hover {
    color: var(--o-color-primary1);
  }
}

.without-url {
  pointer-events: none;
  color: var(--o-color-info1) !important;
}
</style>
