import { computed } from 'vue';
import { useData } from 'vitepress';
import { defineStore } from 'pinia';

export const useVersionStore = defineStore('version', () => {
  const { page } = useData();

  // 当前版本
  const version = computed(() => {
    return page.value.filePath.split('/')[2] || '';
  });

  return {
    version,
  };
});
