<script setup lang="ts">
import { ref } from 'vue';
import { ODropdownItem, OPopup } from '@opensig/opendesign';

import DocBugDialog from '@/components/doc/DocBugDialog.vue';
import useSelect from '@/composables/useSelect';
import { useLocale } from '@/composables/useLocale';
import { useScreen } from '@/composables/useScreen';

const { t } = useLocale();
const { gtPadV } = useScreen();
const { visible, x, y, selectionText } = useSelect('.doc-content');
const docBugVisible = ref(false);

const showDialog = () => {
  docBugVisible.value = true;
  visible.value = false;
}
</script>

<template>
  <!-- 文档选中捉虫 -->
  <OPopup v-if="gtPadV" position="top" wrap-class="feedback-bug-popover" :visible="visible" trigger="none">
    <template #target>
      <div
        :style="{
          '--x': x + 'px',
          '--y': y + 'px',
        }"
        class="select-feedback-placeholder"
      ></div>
    </template>
    <ODropdownItem @click="showDialog"> {{ t('feedback.bugCatching') }} </ODropdownItem>
  </OPopup>

  <!-- 文档捉虫弹窗 -->
  <DocBugDialog v-if="gtPadV" v-model="docBugVisible" :selection-text="selectionText" />
</template>

<style lang="scss" scoped>
.feedback-bug-popover {
  --popup-bg-color: var(--o-color-fill2);
  --popup-radius: var(--o-radius-xs);

  .o-dropdown-item {
    background-image: url('@/assets/category/docs/docsBugBg.png');
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    justify-content: flex-start;
    width: auto;
    padding: 3px 12px;
    color: var(--o-color-white);
  }
}

.select-feedback-placeholder {
  position: absolute;
  left: var(--x);
  top: var(--y);
}
</style>
