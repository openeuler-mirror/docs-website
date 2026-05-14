<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';
import { isArray, OMenuItem, OSubMenu } from '@opensig/opendesign';

import type { DocMenuNodeT } from '@/utils/tree';
import { useLocale } from '@/composables/useLocale';
import { refreshSelectedMenuItemPosition } from '@/utils/refresh-ui';

const props = defineProps({
  node: {
    type: Object as PropType<DocMenuNodeT>,
    required: true,
  },
});

const { isZh } = useLocale();

const itemRef = ref();
const emits = defineEmits(['click']);
const parentProps = inject<{
  readonly modelValue: string;
}>('parentProps');

watch(
  () => parentProps?.modelValue,
  () => {
    if (props.node.id === parentProps?.modelValue && itemRef.value?.$el) {
      refreshSelectedMenuItemPosition();
    }
  }
);

const stopPropagation = (ev: MouseEvent) => ev.stopPropagation();

onMounted(() => {
  if (isArray(props.node.children) && props.node.children.length > 0 && itemRef.value?.$el) {
    const el = itemRef.value.$el.querySelector('.o-sub-menu-children') as HTMLElement;
    if (el) {
      el.addEventListener('click', stopPropagation);
    }
  }
});

onBeforeUnmount(() => {
  if (isArray(props.node.children) && props.node.children.length > 0 && itemRef.value?.$el) {
    const el = itemRef.value.$el.querySelector('.o-sub-menu-children') as HTMLElement;
    if (el) {
      el.removeEventListener('click', stopPropagation);
    }
  }
});

// ================埋点================
const reportTocNodePath = (node: DocMenuNodeT) => {
  let _node = node as DocMenuNodeT | null;
  const path = [] as string[];
  while (_node && _node.type !== 'root') {
    path.unshift(_node.label);
    _node = _node.parent;
  }
  const sp = location.pathname.split('/');
  if (sp.length > 3) {
    path.unshift(sp[3]);
  }
  return path.reduce(
    (acc, item, index) => {
      acc[`level_${index + 1}`] = item;
      return acc;
    },
    {} as Record<string, string>
  );
};
</script>

<template>
  <OSubMenu
    v-if="isArray(node.children) && node.children.length > 0"
    ref="itemRef"
    :id="node.id === parentProps?.modelValue ? 'rec-active-menu-item' : undefined"
    :value="node.id"
    :selectable="node.type === 'page'"
    :title="!isZh ? node.label : ''"
    @click="emits('click', node)"
  >
    <template #title>
      <a v-if="node.href && node.type === 'page'" class="doc-item-text" v-analytics.bubble="() => reportTocNodePath(node)" :href="node.href" @click.prevent>{{ node.label }}</a>
      <span v-else>{{ node.label }}</span>
    </template>
    <RecursionMenuItem v-for="item in node.children" :key="item.id" :node="item" @click="(el) => emits('click', el)" />
  </OSubMenu>
  <OMenuItem
    v-else
    ref="itemRef"
    :id="node.id === parentProps?.modelValue ? 'rec-active-menu-item' : undefined"
    :value="node.id"
    @click="emits('click', node)"
    :title="!isZh ? node.label : ''"
  >
    <a v-if="node.href" :href="node.href" class="doc-item-text" v-analytics.bubble="() => reportTocNodePath(node)" @click.prevent>{{ node.label }}</a>
    <span v-else>{{ node.label }}</span>
  </OMenuItem>
</template>

<style lang="scss" scoped>
:deep(.o-menu-item-content) {
  width: 100%;
}

.doc-item-text { 
  display: inline-block;
  color: inherit;
  width: 100%;
}
</style>
