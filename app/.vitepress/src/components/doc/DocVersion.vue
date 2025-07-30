<script setup lang="ts">
import { OIcon, ODropdown, ODropdownItem, OScroller, OTag, useMessage } from '@opensig/opendesign';

import IconChevronDown from '~icons/app/icon-chevron-down.svg';

import { versions } from '@/config/version';
import { useLocale } from '@/composables/useLocale';
import { isPageExist } from '@/api/api-common';
import { useNodeStore } from '@/stores/node';

defineProps({
  version: {
    type: String,
    default: '',
  },
});

const { t, locale } = useLocale();
const message = useMessage();
const nodeStore = useNodeStore();


const changeVersion = async (item: { value: string; href?: string }) => {
  if (item.href) {
    window.open(item.href, '_blank', 'noopener noreferrer');
    return;
  }

  if (!nodeStore.moduleNode) {
    return;
  }

  const arr = nodeStore.moduleNode.href!.split('/');
  arr[3] = item.value;

  if (await isPageExist(arr.join('/'))) {
    window.open(arr.join('/'), '_blank', 'noopener noreferrer');
  } else {
    message.info({
      content: '暂无对应版本的文档内容',
    });
  }
};
</script>

<template>
  <ODropdown trigger="hover" option-position="bl">
    <div class="version-wrap hover-icon-rotate">
      <span class="version-title">{{ t('docs.version') }}</span>
      <span class="version-text">{{ version.replace(/_/g, ' ') }}</span>
      <OIcon class="icon"><IconChevronDown /></OIcon>
    </div>
    <template #dropdown>
      <OScroller class="version-scroller" show-type="hover" size="small" disabled-x>
        <ODropdownItem
          v-for="item in versions[locale]"
          :key="item.value"
          :class="{ 'version-dropdown-active': version === item.value, 'o-dropdown-item-en': locale === 'en' }"
          :style="{ '--dropdown-item-color-hover': 'var(--o-color-info2)' }"
          @click="changeVersion(item)"
        >
          {{ item.label }}
          <OTag v-if="item.archive"> {{ t('docs.archive') }} </OTag>
        </ODropdownItem>
      </OScroller>
    </template>
  </ODropdown>
</template>

<style lang="scss" scoped>
.icon {
  font-size: 24px;
}

.version-wrap {
  height: 100%;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--o-color-info1);

  @include hover {
    .version-text {
      color: var(--o-color-info2);
    }
  }
}

.version-title {
  white-space: pre;
  @include text1;
}

.version-text {
  @include text1;
  margin-right: 8px;
}

.version-scroller {
  max-height: 200px;

  :deep(.o-scrollbar-y) {
    --scrollbar-y-right: -4px;
  }
}

.version-dropdown-active {
  color: var(--o-color-primary1);
  background-color: var(--o-color-control3-light);
  @include hover {
    color: var(--o-color-primary1);
    background-color: var(--o-color-control3-light);
  }
}

.o-dropdown {
  display: inline-block;
  margin-bottom: 24px;
  @include respond-to('<=laptop') {
    margin-bottom: 16px;
  }
}

.o-dropdown-item {
  @include text1;
  width: 192px;
  white-space: nowrap;
  --dropdown-item-justify: flex-start;
  --dropdown-item-padding: 7px 12px;
  @include hover {
    background-color: var(--o-color-control2-light);
    .o-tag {
      --tag-bd-color: var(--o-color-control1-light);
    }
  }
}

.o-dropdown-item-en {
  width: 248px;
}

.o-tag {
  --tag-radius: var(--o-radius-xs);
  --tag-bg-color: var(--o-color-control2-light);
  --tag-bd-color: var(--o-color-control2-light);
  --tag-padding: 0 8px;
  margin-left: 6px;

  :deep(.o-tag-label) {
    --tag-text-size: 10px;
    --tag-text-height: 16px;
  }
}
</style>
