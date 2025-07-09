import { computed, ref } from 'vue';
import { useData, useRoute } from 'vitepress';
import { defineStore } from 'pinia';

export const useViewStore = defineStore('view', () => {
  const route = useRoute();
  const { frontmatter, page } = useData();

  // 容器是否在滚动
  const isScrolling = ref(false);

  // 是否为主页页面
  const isHomeView = computed(() => {
    return page.value.filePath === 'zh/index.md' || page.value.filePath === 'en/index.md';
  });

  // 是否为通用文章页面
  const isCustomView = computed(() => {
    return frontmatter.value.layout === 'page';
  });

  // 是否为模块总览页面
  const isOverview = computed(() => {
    return !!frontmatter.value.overview;
  });

  // 是否为 common 内容 (贡献指南、FAQ等页面)
  const isCommonView = computed(() => {
    return route.path.includes('/docs/common/');
  });

  return {
    isScrolling,
    isHomeView,
    isCustomView,
    isOverview,
    isCommonView,
  };
});
