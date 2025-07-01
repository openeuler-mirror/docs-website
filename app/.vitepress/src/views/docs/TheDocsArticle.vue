<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

import DocPagination from '@/components/doc/DocPagination.vue';
import GiteeViewSource from '@/components/GiteeViewSource.vue';

import { type DocMenuNodeT } from '@/utils/tree';
import { getOffsetTop, getScrollRemainingBottom } from '@/utils/element';
import { useViewStore } from '@/stores/view';
import { useNodeStore } from '@/stores/node';

const emits = defineEmits<{
  (evt: 'update-menu-expaned'): void;
  (evt: 'change-anchor', value: string): void;
  (evt: 'page-change', type: 'prev' | 'next'): void;
}>();

const viewStore = useViewStore();
const nodeStore = useNodeStore();

// -------------------- 菜单更新锚点选中 --------------------
const onScrollUpdateAnchor = () => {
  if (viewStore.isScrolling) {
    return;
  }

  if (!nodeStore.pageNode || nodeStore.pageNode.children.every((item) => item.type !== 'anchor')) {
    return;
  }

  const scrollContainer = document.querySelector<HTMLElement>('#app > .o-scroller > .o-scroller-container');
  if (!scrollContainer) {
    return;
  }

  const contentDom = document.querySelector('.ly-doc');
  if (!contentDom) {
    return;
  }

  const scrollRemainingBottom = getScrollRemainingBottom(scrollContainer);
  const distances: Array<{ item: DocMenuNodeT; top: number }> = [];
  const titleDom = contentDom.querySelector<HTMLElement>('h1');
  if (titleDom) {
    const top = getOffsetTop(titleDom, scrollContainer);
    if (top < 110 || (scrollRemainingBottom < 100 && top >= 110)) {
      distances.push({
        item: nodeStore.pageNode,
        top,
      });
    }
  }

  const allChildren: DocMenuNodeT[] = [];
  nodeStore.pageNode.children.forEach((item) => {
    allChildren.push(item);
    if (item.children.length > 0) {
      item.children.forEach((e) => {
        allChildren.push(e);
      });
    }
  });

  for (const item of allChildren) {
    if (!item.href || !item.href.includes('#')) {
      continue;
    }

    const [_, hash] = item.href.split('#');
    const id = decodeURIComponent(hash);
    const target = contentDom.querySelector<HTMLElement>(`#${id}`);
    if (!target) {
      continue;
    }

    const top = getOffsetTop(target, scrollContainer);

    if (top < 110 || (scrollRemainingBottom < 100 && top >= 110)) {
      distances.push({
        item,
        top,
      });
    }
  }

  if (distances.length) {
    if (scrollRemainingBottom < 10) {
      emits('change-anchor', distances[distances.length - 1].item.id);
    } else if (scrollRemainingBottom < 110) {
      const overNodes = distances.filter((item) => item.top >= 110);
      if (overNodes.length) {
        const average = Math.round(110 / overNodes.length);
        const node = overNodes.find((_, i) => (i + 1) * average < 110 - scrollRemainingBottom);
        if (node) {
          emits('change-anchor', node.item.id);
        }
      }
    } else {
      const max = distances.reduce((prev, cur) => (prev.top > cur.top ? prev : cur));
      emits('change-anchor', max.item.id);
    }
  } else {
    emits('change-anchor', nodeStore.pageNode.id);
  }
};

onMounted(() => {
  const scrollContainer = document.querySelector<HTMLElement>('#app > .o-scroller > .o-scroller-container');
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', onScrollUpdateAnchor);
  }
});

onUnmounted(() => {
  const scrollContainer = document.querySelector<HTMLElement>('#app > .o-scroller > .o-scroller-container');
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', onScrollUpdateAnchor);
  }
});

// -------------------- 点击锚点链接滚动到指定位置 --------------------
const onClickContent = (evt: PointerEvent) => {
  if (evt.target && (evt.target as HTMLLinkElement)?.tagName === 'A') {
    setTimeout(() => {
      emits('update-menu-expaned');
    }, 200);
  }
};
</script>

<template>
  <div class="doc-body">
    <Content class="markdown-body" @click="onClickContent" />
    <GiteeViewSource />
    <ClientOnly>
      <DocPagination :node="nodeStore.manualNode ? [nodeStore.manualNode] : []" @page-change="(type) => emits('page-change', type)" />
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.doc-body {
  position: relative;
  min-height: calc(100vh - var(--layout-header-height) - var(--layout-doc-padding-top) - var(--layout-doc-padding-bottom) - 48px);
  padding: var(--layout-doc-content-padding);
  border-radius: var(--o-radius-xs);
  background: var(--o-color-fill2);
  display: flex;
  flex-direction: column;
}
</style>
