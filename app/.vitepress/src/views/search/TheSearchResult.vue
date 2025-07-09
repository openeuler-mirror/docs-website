<script setup lang="ts">
import { ref, computed, onMounted, watch, type PropType } from 'vue';
import { useRoute } from 'vitepress';
import { OIcon, OBreadcrumb, OBreadcrumbItem, OPagination, OLoading, isClient } from '@opensig/opendesign';

import ResultEmpty from '@/components/ResultEmpty.vue';
import IconChevronRight from '~icons/app/icon-chevron-right.svg';

import { getSearchDocs } from '@/api/api-search';

import type { SearchDocItemT } from '@/@types/type-search';

import { DocMenuTree, type DocMenuNodeT } from '@/utils/tree';

import { useScreen } from '@/composables/useScreen';
import { useLocale } from '@/composables/useLocale';
import { useSearchingStore } from '@/stores/common';
import { scrollToTop } from '@/utils/common';
import { useNodeStore } from '@/stores/node';
import { useViewStore } from '@/stores/view';

const props = defineProps({
  // 菜单数据
  node: {
    type: Array as PropType<DocMenuNodeT[]>,
    default: () => [],
  },
});

const result = ref<SearchDocItemT[]>([]);
const route = useRoute();
const { t, locale } = useLocale();
const searchStore = useSearchingStore();
const { isPhone } = useScreen();
const nodeStore = useNodeStore();
const viewStore = useViewStore();

// n叉树
const tree = computed(() => {
  return new DocMenuTree(props.node as any, '');
});

// 分页数据
const total = ref(0);
const currentPage = ref(1);
const pagesize = ref(10);
const pageSizes = ref([10, 20, 50]);

// 是否加载loading
const isLoading = ref(false);

// ----------------------- 监听是否加载loading -----------------------
watch(
  () => searchStore.isLoading,
  () => {
    isLoading.value = searchStore.isLoading;
  },
  { immediate: true }
);

// ----------------------- 获取搜索结果 -----------------------
const searchResult = async () => {
  try {
    searchStore.setIsLoading(true);
    const url = (viewStore.isOverview ? nodeStore.moduleNode?.href : nodeStore.manualNode?.href) || route.path;
    const res = await getSearchDocs({
      keyword: searchStore.keyword,
      lang: locale.value,
      page: currentPage.value,
      version: route.path.split('/')?.[3] || searchStore.version,
      path: url.replace(`/${locale.value}/`, '').replace('/index.html', ''),
    });

    let records: SearchDocItemT[] = [];
    if (res.status == 200) {
      records = res.obj.records;
      records.map((item) => {
        if (item.path) {
          item.path = `/${item.path}.html`;

          let pathTempData = [];

          let node = tree.value.getNode(tree.value.root, 'href', item.path);

          if (node) {
            while (node && node.depth !== 0 && node.parent) {
              pathTempData.unshift(node);
              node = node?.parent;
            }
          }

          item.sourceData = pathTempData.slice(pathTempData.length - 1);
        }
      });
    }

    result.value = records;
    total.value = res?.obj?.count || 0;
  } finally {
    searchStore.setIsLoading(false);
  }
};

onMounted(() => {
  searchDoc();
});

// ----------------------- 监听搜索词变化触发搜索 -----------------------
watch(
  () => searchStore.keyword,
  () => {
    searchDoc();
  },
  { deep: true }
);
// ----------------------- 获取搜索结果数量及结果 -----------------------
const searchDoc = () => {
  if (isClient) {
    currentPage.value = 1;
    searchResult();
  }
};
// ----------------------- 分页 -----------------------
const onChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
  searchStore.setCurrentPage(page);
  currentPage.value = page;
  pagesize.value = pageSize;
  searchResult();
  scrollToTop();
};

// -------------------- 跳转 --------------------
const goToPage = (href: string) => {
  window.open(href);
};
</script>
<template>
  <div class="inner-search">
    <!-- 搜索结果不为空 -->
    <div v-if="total && !isLoading">
      <div class="search-result">
        <div class="search-tip">{{ t('docs.searchResult') }}</div>
        <div class="search-header">
          <div class="search-total">
            {{ t('docs.find') }}<span>“{{ total }}”</span>{{ t('docs.result') }}
          </div>
        </div>
        <div v-for="item in result" class="search-result-item" :key="item.path">
          <a :href="item.path" target="_blank"><div class="item-title" v-dompurify-html="item.title"></div></a>
          <div class="item-content" v-dompurify-html="item?.textContent"></div>
          <div class="item-footer">
            <div class="item-footer-source">
              <span class="source-tip">{{ t('docs.origin') }}：</span>
              <OBreadcrumb>
                <template #separator>
                  <OIcon> <IconChevronRight /> </OIcon>
                </template>
                <OBreadcrumbItem :href="`/${locale}/`" @click.prevent="goToPage(`/${locale}/`)">{{ t('common.docCenter') }}</OBreadcrumbItem>
                <!-- 模块 -->
                <OBreadcrumbItem :href="nodeStore.moduleNode!!.href" @click.prevent="goToPage(nodeStore.moduleNode!!.href as string)">{{
                  nodeStore.moduleNode!!.label
                }}</OBreadcrumbItem>
                <OBreadcrumbItem v-for="node in item.sourceData" :key="node.id">{{ node.label }}</OBreadcrumbItem>
              </OBreadcrumb>
            </div>
            <div>
              <span class="source-tip">{{ t('docs.version') }}{{ item.version }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 分页器-->
      <div v-show="!isPhone">
        <OPagination :total="total" :page="currentPage" :page-size="pagesize" :page-sizes="pageSizes" :show-more="false" show-jumper @change="onChange" />
      </div>
    </div>
    <!-- loading -->
    <ClientOnly>
      <OLoading v-model:visible="isLoading" wrapper=".inner-search" :mask="false" />
    </ClientOnly>
    <!-- 搜索结果为空 -->
    <div class="no-result-wrapper search-result" v-if="!total && !isLoading">
      <div class="no-result-header">
        <div class="search-tip">{{ t('docs.searchResult') }}</div>
        <div class="search-header">
          <div class="search-total">
            {{ t('docs.find') }}<span>“{{ total }}”</span>{{ t('docs.result') }}
          </div>
        </div>
      </div>
      <div class="no-result-content">
        <ResultEmpty :description="t('docs.noResultText')" :style="{ '--result-image-width': '230px', '--result-image-height': 'auto' }"> </ResultEmpty>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.inner-search {
  position: relative;
  min-height: calc(100vh - var(--layout-header-height) - 128px);
}

.search-result {
  background-color: var(--o-color-fill2);
  padding: 24px 40px;
  overflow: hidden;
  border-radius: 8px;
}
.search-tip {
  @include h1;
  color: var(--o-color-info1);
  font-weight: 500;
}
.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
}
.search-total {
  @include tip1;
  color: var(--o-color-info3);
  span {
    color: var(--o-color-info3) !important;
  }
}
.search-sort .o-dropdown {
  @include tip1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;

  .o-icon {
    margin-left: var(--o-gap-2);
  }
}

.source-tip {
  opacity: 0.6;
}
.search-result-item {
  margin-top: 32px;
}
.item-title {
  @include text2;
  color: var(--o-color-info1);
  font-weight: 500;
  @include hover {
    color: var(--o-color-link1);
  }
}
.item-content {
  margin: 12px 0 8px 0;
  @include tip1-response-max-height;
  overflow: hidden;
  position: relative;
  opacity: 0.8;
  &:after {
    background-image: linear-gradient(90deg, hsla(0, 0%, 93%, 0), hsla(0, 0%, 100%, 0.8) 59%, #fff 100%);
    bottom: 0;
    content: '';
    height: 22px;
    pointer-events: none;
    position: absolute;
    right: 0;
    width: 4em;
  }
}

@include in-dark {
  .item-content {
    &:after {
      width: 12em;
      background-image: linear-gradient(90deg, rgba(36, 36, 39, 0) 31%, #242427 97%);
    }
  }
}

:deep(.search-result span:not(.item-footer span)) {
  color: var(--o-color-link1);
}
.item-footer {
  display: flex;
  justify-content: space-between;
  @include tip2;
}
.o-breadcrumb-item {
  --breadcrumb-seperator-size: 16px;
  @include tip2;
}

.o-pagination {
  margin-top: var(--o-gap-5);
  display: flex;
  justify-content: flex-end;
}

.no-result-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100vh - var(--layout-header-height) - 246px);
  overflow: hidden;
}

@include respond-to('<=laptop') {
  .search-result {
    padding: 24px;
  }

  .search-header {
    margin-top: 16px;
  }

  .search-result-item {
    margin-top: 24px;
  }
}

@include respond-to('<=pad') {
  .search-result {
    padding: 16px;
  }

  .search-header {
    margin-top: 12px;
  }

  .search-result-item {
    margin-top: 16px;
  }
}

:deep(.o-breadcrumb) {
  --breadcrumb-color-selected: var(--o-color-info3);
}

.o-breadcrumb-item:last-child {
  :deep(.o-breadcrumb-item-label) {
    cursor: pointer;
  }
}
</style>
