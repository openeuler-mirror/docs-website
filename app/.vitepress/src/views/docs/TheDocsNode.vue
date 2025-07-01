<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { ORow, OCol, OLink } from '@opensig/opendesign';

import { getNodeHrefSafely, type DocMenuNodeT } from '@/utils/tree';
import { getOffsetTop, getScrollRemainingBottom } from '@/utils/element';
import { getDomId } from '@/utils/common'; 
import { useScreen } from '@/composables/useScreen';
import { useNodeStore } from '@/stores/node';

const emits = defineEmits<{
  (evt: 'change-node-index', value: number): void;
}>();

const { isLaptop, isPhone } = useScreen();
const space = computed(() => {
  if (isLaptop) {
    return `0 24px`;
  }
  return '0 40px';
});

const nodeStore = useNodeStore();
const manaulNodes = computed(() => {
  return nodeStore.moduleNode ? nodeStore.moduleNode.children : [];
});

// -------------------- 优化节点层级，和左侧菜单保持一致 --------------------
const nodeVisible = computed(() => {
  return manaulNodes.value[0]?.isManual || manaulNodes.value[0]?.children?.length === 0;
});
const nodeMenu = computed(() => {
  if (nodeVisible.value) {
    return (manaulNodes.value[0]?.parent ? [manaulNodes.value[0]?.parent] : []) as DocMenuNodeT[];
  }
  return manaulNodes.value || [];
});

// -------------------- 文档模块节点菜单同步滚动 --------------------
const oscrollerDom = ref();
const menuScrollDom = ref();

const listenScroll = () => {
  const contentHeight = oscrollerDom.value.querySelector('.docs-node').offsetHeight; // 内容区滚动高度
  const menuHeight = menuScrollDom.value.scrollHeight; // 左侧菜单滚动高度

  const contentTop = oscrollerDom.value.scrollTop - 350; // 内容区滚动距离
  menuScrollDom.value.scrollTop = (menuHeight / contentHeight) * contentTop; // 左侧菜单应滚动的高度
};

onMounted(() => {
  oscrollerDom.value = document.querySelector('#app > .o-scroller > .o-scroller-container');
  menuScrollDom.value = document.querySelector('#menuScrollDom > .o-scroller-container');
  oscrollerDom.value?.addEventListener('scroll', listenScroll);
});

onUnmounted(() => {
  oscrollerDom.value?.removeEventListener('scroll', listenScroll);
});

// -------------------- 文档模块节点菜单设置绑定值 --------------------
const nodeScrollContainer = ref<HTMLElement>();
const onScrollNodeAnchor = useDebounceFn(() => {
  if (nodeScrollContainer.value) {
    const idArr = nodeScrollContainer.value?.querySelector('.docs-node')?.querySelectorAll<HTMLElement>('[id]') || [];
    const distances: Array<{ index: number; top: number }> = [];

    const scrollRemainingBottom = getScrollRemainingBottom(nodeScrollContainer.value);

    for (let i = 0; i < idArr.length; i++) {
      const top = getOffsetTop(idArr[i], nodeScrollContainer.value);
      if (top < 120 || (scrollRemainingBottom < 100 && top >= 120)) {
        distances.push({
          index: i,
          top,
        });
      }
    }

    if (distances.length) {
      if (scrollRemainingBottom < 10) {
        emits('change-node-index', distances[distances.length - 1].index);
      } else if (scrollRemainingBottom < 120) {
        const overNodes = distances.filter((item) => item.top >= 120);
        if (overNodes.length) {
          const average = Math.round(110 / overNodes.length);
          const node = overNodes.find((_, i) => (i + 1) * average < 120 - scrollRemainingBottom);
          if (node) {
            emits('change-node-index', node.index);
          }
        }
      } else {
        const max = distances.reduce((prev, cur) => (prev > cur ? prev : cur));
        emits('change-node-index', max.index);
      }
    }
  }
}, 100);

onMounted(() => {
  nodeScrollContainer.value = document.querySelector<HTMLElement>('#app > .o-scroller > .o-scroller-container')!;
  nodeScrollContainer.value?.addEventListener('scroll', onScrollNodeAnchor);
});

onUnmounted(() => {
  nodeScrollContainer.value?.removeEventListener('scroll', onScrollNodeAnchor);
});
</script>

<template>
  <div class="docs-node">
    <ORow :gap="space" wrap="wrap" class="menu-node">
      <OCol flex="0 0 100%" v-for="item in nodeMenu" :key="item.id">
        <p v-if="!nodeVisible" class="node-title" :id="getDomId(item.label)">{{ item.label }}</p>
        <div v-if="item?.children?.length" class="child-node">
          <div
            v-for="child in item?.children"
            :key="child.id"
            :class="[!child?.href?.includes('.html') && !child?.description ? 'item-child-node' : 'item-child']"
          >
            <!-- 有子层级 -->
            <template v-if="!child?.href?.includes('.html') && !child?.description">
              <p class="child-node-title">{{ child.label }}</p>
              <ORow :gap="isPhone ? '0px 8px' : '24px 16px'" wrap="wrap" class="child-node-list">
                <OCol :flex="isPhone ? '0 0 100%' : '0 0 50%'" v-for="ch in child?.children" :key="ch.id">
                  <div class="item-node">
                    <OLink color="primary" size="auto" variant="text" :href="getNodeHrefSafely(ch)" target="_blank" hover-underline>{{ ch.label }}</OLink>
                    <p v-if="ch?.description" class="description">{{ ch?.description }}</p>
                  </div>
                </OCol>
              </ORow>
            </template>
            <template v-else>
              <div class="item-node">
                <OLink color="primary" size="auto" variant="text" :href="getNodeHrefSafely(child)" target="_blank" hover-underline>{{ child.label }}</OLink>
                <p v-if="child?.description" class="description">{{ child?.description }}</p>
              </div>
            </template>
          </div>
        </div>
        <div v-else class="child-node">
          <div class="item-node">
            <OLink color="primary" size="auto" variant="text" :href="getNodeHrefSafely(item)" target="_blank" hover-underline>{{ item.label }}</OLink>
            <p v-if="item?.description" class="description">{{ item?.description }}</p>
          </div>
        </div>
      </OCol>
    </ORow>
  </div>
</template>

<style lang="scss" scoped>
.docs-node {
  background: var(--o-color-fill2);
  min-height: calc(var(--layout-content-min-height) - var(--layout-doc-padding-top) - var(--layout-doc-padding-bottom) - 40px);
  padding: 32px 40px 56px;
  border-radius: var(--o-radius-xs);
}
.node-title {
  font-weight: 500;
  color: var(--o-color-info1);
  margin-bottom: 16px;
  @include h4;
}
.child-node {
  border: 1px solid var(--o-color-control4);
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  border-radius: var(--o-radius-xs);
  div {
    &:last-child {
      margin-bottom: 0;
    }
  }
  .item-child {
    &:nth-last-child(2) {
      margin-bottom: 0;
    }
  }
}
.item-child-node {
  width: 100%;
  margin-bottom: 24px;
}
.item-child {
  width: calc(50% - 12px);
  margin-bottom: 16px;
}

.child-node-title {
  font-weight: 500;
  color: var(--o-color-info3);
  margin-bottom: 12px;
  @include h4;
}

.child-node-list {
  .o-col {
    &:nth-last-child(-n + 2) {
      --col-gap-y: 0;
    }
  }
}

.description {
  color: var(--o-color-info2);
  margin-top: 16px;
  @include tip1;
}

.o-link {
  font-weight: 500;
  padding: 0;
  @include text2;
}

@include respond-to('<=laptop') {
  .docs-node {
    padding: 24px;
  }
  .node-title {
    margin-bottom: 12px;
  }
  .child-node {
    padding: 16px 24px;
  }
  .item-child-node {
    margin-bottom: 16px;
  }
  .child-node-title {
    margin-bottom: 8px;
  }
  .description {
    margin-top: 12px;
  }
}

@include respond-to('phone') {
  .docs-node {
    padding: 12px;
  }
  .node-title {
    margin-bottom: 8px;
    @include h2;
  }
  .child-node {
    padding: 12px;
  }
  .item-child-node {
    margin-bottom: 12px;
  }
  .item-child {
    width: 100%;
    margin-bottom: 12px !important;
    &:last-of-type {
      margin-bottom: 0 !important;
    }
  }
  .child-node-list {
    .o-col {
      margin-bottom: 12px;
    }
  }
  .description {
    margin-top: 8px;
  }
}
</style>
