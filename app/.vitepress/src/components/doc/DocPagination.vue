<script setup lang="ts">
import { computed } from 'vue';
import { ODivider, OIcon, OIconArrowRight, OIconArrowLeft } from '@opensig/opendesign';

import type { DocMenuNodeT } from '@/utils/tree';
import { useLocale } from '@/composables/useLocale';
import { useNodeStore } from '@/stores/node';

const emits = defineEmits<{
  (evt: 'page-change', type: 'prev' | 'next'): void;
}>();

const nodeStore = useNodeStore();

const getPageNodes = (node: DocMenuNodeT) => {
  const result = [];
  if (node.type === 'page') {
    result.push(node);
  }

  node.children.forEach((item) => {
    result.push(...getPageNodes(item));
  });

  return result;
};

const allPageNodes = computed(() => {
  return nodeStore.manualNode ? getPageNodes(nodeStore.manualNode) : [];
});

const { t } = useLocale();

const config = computed(() => {
  const idx = allPageNodes.value.findIndex((item) => item.id === nodeStore.pageNode?.id);
  const prev = allPageNodes.value[idx - 1];
  const next = allPageNodes.value[idx + 1];
  return {
    nextHref: next?.href,
    nextLabel: next?.label,
    prevHref: prev?.href,
    prevLabel: prev?.label,
  };
});
</script>

<template>
  <div v-if="config.prevHref || config.nextHref" class="doc-footer">
    <ODivider />
    <div class="doc-footer-content">
      <div class="link-item">
        <a :href="config.prevHref" v-if="config.prevHref && config.prevLabel" @click="emits('page-change', 'prev')">
          <OIcon>
            <OIconArrowLeft />
          </OIcon>
          <span class="link-text">{{ t('docs.previous') }}</span>
          <span>{{ config.prevLabel }}</span>
        </a>
      </div>
      <div class="link-item">
        <a :href="config.nextHref" v-if="config.nextHref && config.nextLabel" @click="emits('page-change', 'next')">
          <span>{{ t('docs.next') }}</span>
          <span class="link-text">{{ config.nextLabel }}</span>
          <OIcon>
            <OIconArrowRight />
          </OIcon>
        </a>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.doc-footer {
  padding-bottom: 16px;
  margin-top: auto;
}
.o-divider {
  --o-divider-gap: 32px 0 30px;
}

.doc-footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;

  @include respond-to('phone') {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    .link-item + .link-item {
      margin-top: 8px;
    }
  }
}

.link-item {
  a {
    display: flex;
    align-items: center;
    @include text1;
  }

  .o-icon {
    @include h2;
  }

  .link-text {
    margin: 0 16px 0 10px;
  }
}

@include respond-to('<=laptop') {
  .o-divider {
    --o-divider-gap: 24px;
  }
}

@include respond-to('phone') {
  .o-divider {
    --o-divider-gap: 12px 0;
  }
}
</style>
