import { computed } from 'vue';
import { useData } from 'vitepress';
import { defineStore } from 'pinia';
import { isClient } from '@opensig/opendesign';

import { TOC_CONFIG, TOC_EN_CONFIG } from '@/config/toc';
import { DocMenuTree, type DocMenuNodeT } from '@/utils/tree';

export const useNodeStore = defineStore('node', () => {
  const rootTree = new DocMenuTree([...TOC_CONFIG, ...TOC_EN_CONFIG]);
  const { hash, page } = useData();

  // 页面路径
  const pathname = computed(() => {
    return `/${page.value.filePath.replace('.md', '.html')}`;
  });

  // 页面节点
  const pageNode = computed(() => {
    if (isClient && window.location.search) {
      const node = rootTree.getNode(rootTree.root, 'href', `${pathname.value}${decodeURIComponent(window.location.search)}`);
      if (node) {
        return node;
      }
    }

    return rootTree.getNode(rootTree.root, 'href', pathname.value);
  });

  // 当前节点
  const currentNode = computed(() => {
    if (pageNode.value && hash.value) {
      const node = rootTree.getNode(rootTree.root, 'href', `${pageNode.value.href}${decodeURIComponent(hash.value)}`);
      if (node) {
        return node;
      }
    }

    return hash.value ? rootTree.getNode(rootTree.root, 'href', `${pathname.value}${decodeURIComponent(hash.value)}`) || pageNode.value : pageNode.value;
  });

  // 手册节点
  const manualNode = computed(() => {
    let node: DocMenuNodeT | null = pageNode.value;
    while (node && !node.isManual) {
      node = node.parent;
    }

    return node;
  });

  // 模块节点
  const moduleNode = computed(() => {
    const node = rootTree.root.children.find((item) => item.href && pathname.value.includes(item.href.replace('index.html', '')));
    if (node && pathname.value.toLocaleLowerCase().includes('/tools/')) {
      return node.children.find((item) => item.href && pathname.value.includes(item.href.replace('index.html', '')));
    }

    return node;
  });

  // 所有前驱节点
  const prevNodes = computed(() => {
    return currentNode.value ? rootTree.getPrevNodes(currentNode.value, 1) : [];
  });

  return {
    currentNode, // 当前节点
    pageNode, // 页面节点
    manualNode, // 手册节点
    moduleNode, // 模块节点
    prevNodes, // 所有前驱节点
  };
});
