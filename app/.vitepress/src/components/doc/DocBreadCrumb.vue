<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vitepress';
import { OBreadcrumb, OBreadcrumbItem, OIcon } from '@opensig/opendesign';

import { useLocale } from '@/composables/useLocale';
import { useViewStore } from '@/stores/view';
import { useNodeStore } from '@/stores/node';
import { useSearchingStore } from '@/stores/common';

import IconChevronRight from '~icons/app/icon-chevron-right.svg';

const { t, locale } = useLocale();
const viewStore = useViewStore();
const nodeStore = useNodeStore();
const searchStore = useSearchingStore();

// -------------------- 是否需要显示模块节点 --------------------
const showModuleItem = computed(() => {
  return (!viewStore.isOverview && !viewStore.isCommonView) || (viewStore.isOverview && searchStore.isSearching);
});

// -------------------- 当前节点标题 --------------------
const currentTitle = computed(() => {
  return viewStore.isOverview ? nodeStore.moduleNode?.label : nodeStore.pageNode?.label;
});

// -------------------- 跳转 --------------------
const router = useRouter();
const goToPage = (href: string) => {
  if (href === `/${locale.value}/`) {
    window.location.href = href; // 分支容器没有/zh和/en相关资源，需要重载触发转发
  } else {
    router.go(href);
  }

  useSearchingStore().isSearching = false;
};
</script>

<template>
  <div class="breadcrumb">
    <OBreadcrumb>
      <template #separator>
        <OIcon> <IconChevronRight /> </OIcon>
      </template>
      <!-- 文档聚合页 -->
      <OBreadcrumbItem :href="`/${locale}/`" @click.prevent="goToPage(`/${locale}/`)">{{ t('home.docCenter') }}</OBreadcrumbItem>
      <!-- 模块 -->
      <OBreadcrumbItem v-if="showModuleItem" :href="nodeStore.moduleNode?.href || ''" @click.prevent="goToPage(nodeStore.moduleNode?.href || '')">{{
        nodeStore.moduleNode?.label
      }}</OBreadcrumbItem>
      <!-- 当前节点 -->
      <OBreadcrumbItem>{{ searchStore.isSearching ? t('docs.searchResult') : currentTitle }}</OBreadcrumbItem>
    </OBreadcrumb>
  </div>
</template>

<style lang="scss" scoped>
.breadcrumb {
  height: 24px;
  margin-bottom: 24px;
  @include respond-to('<=laptop') {
    height: 18px;
  }
}
</style>
