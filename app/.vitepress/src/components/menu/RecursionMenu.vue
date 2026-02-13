<script setup lang="ts">
import { provide, type PropType } from 'vue';
import { useVModel } from '@vueuse/core';
import { OMenu } from '@opensig/opendesign';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  expanded: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  defaultExpanded: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
});
provide('parentProps', props);

const emits = defineEmits(['update:modelValue', 'update:expanded']);
const menuValue = useVModel(props, 'modelValue', emits);
const expanded = useVModel(props, 'expanded', emits);
</script>

<template>
  <OMenu v-model="menuValue" v-model:expanded="expanded" class="recursion-menu" :default-expanded="defaultExpanded">
    <slot></slot>
  </OMenu>
</template>

<style lang="scss" scoped>
.recursion-menu {
  --menu-width: 272px;
  --menu-padding-v: 8px;
  --menu-padding-h: 8px;
  --menu-secondary-padding-v: 8px;
  --menu-secondary-padding-h: 8px;
  --menu-selected-gap-v: 0px;

  @include respond-to('<=laptop') {
    --menu-width: 207px;
  }
}
</style>
