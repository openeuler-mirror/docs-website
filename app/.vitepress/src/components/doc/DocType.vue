<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vitepress';
import { OIcon, ODropdown, ODropdownItem, OScroller, useMessage } from '@opensig/opendesign';

import IconChevronDown from '~icons/app/icon-chevron-down.svg';

import { HOME_CONFIG, HOME_CONFIG_EN } from '@/config/dsl';
import { useNodeStore } from '@/stores/node';
import { useLocale } from '@/composables/useLocale';
import { isElementVisible } from '@/utils/element';
import { getVersionFromUrl } from '@/utils/common';
import { oaReport } from '@/shared/analytics';
import { isPageExist } from '@/api/api-common';

const props = defineProps({
  version: {
    type: String,
    default: '',
  },
});

const emits = defineEmits<{
  (evt: 'refresh'): void;
}>();

const route = useRoute();
const router = useRouter();
const message = useMessage();
const nodeStore = useNodeStore();
const { locale } = useLocale();

const visible = ref(false);

const config = computed(() => {
  return locale.value === 'zh' ? HOME_CONFIG : HOME_CONFIG_EN;
});

const othersItem = computed(() => {
  return config.value.recommend.items.filter((item) => item.dropdown);
});

watch(visible, (val) => {
  if (val) {
    setTimeout(() => {
      const scroller = document.querySelector<HTMLElement>('.doc-type-scroller .o-scroller-container');
      const el = document.querySelector<HTMLElement>('.doc-type-scroller .doc-type-dropdown-active');
      if (scroller && el && !isElementVisible(el, scroller)) {
        el.scrollIntoView();
      }
    });
  }
});

const isActive = (href: string) => {
  return nodeStore.moduleNode?.href === getVersionHref(href);
};

const getVersionHref = (href: string) => {
  const arr = href.split('/');
  arr[3] = props.version;
  return arr.join('/');
};

const onClickItem = async (href: string) => {
  const newHref = route.path.includes('/docs/common/') || href.includes('/docs/common/') ? href : getVersionHref(href);
  if (nodeStore.moduleNode?.href === newHref) {
    return;
  }
  reportDocTypeClick();
  
  if (await isPageExist(newHref)) {
    const currentVersion = getVersionFromUrl(route.path);
    const hrefVersion = getVersionFromUrl(newHref);
    if (currentVersion === hrefVersion) {
      router.go(newHref);
    } else {
      window.location.href = newHref;
    }
    emits('refresh');
    return;
  }

  message.info({
    content: '暂无对应版本的文档内容',
  });
};

const reportDocTypeClick = () => {
  oaReport('click', {
    $url: location.href,
    type: 'docType',
  });
};
</script>

<template>
  <div>
    <ODropdown v-model:visible="visible" trigger="hover" option-position="bl">
      <div class="doc-type-wrap hover-icon-rotate">
        <p class="doc-type">{{ nodeStore.moduleNode?.label }}</p>
        <OIcon class="icon"><IconChevronDown /></OIcon>
      </div>
      <template #dropdown>
        <OScroller class="doc-type-scroller" show-type="hover" size="small" disabled-x>
          <template v-for="item in config.sections" :key="item.title">
            <div class="doc-type-small-title">{{ item.title }}</div>
            <ODropdownItem
              v-for="subItem in item.items"
              :key="subItem.href"
              :class="{ 'doc-type-dropdown-active': isActive(subItem.href), 'o-dropdown-item-en': locale === 'en' }"
              :style="{ '--dropdown-item-color-hover': 'var(--o-color-info2)' }"
              @click="onClickItem(subItem.href)"
            >
              {{ subItem.title }}
            </ODropdownItem>
          </template>

          <template v-if="othersItem.length">
            <div class="doc-type-small-title">{{ config.recommend.title }}</div>
            <ODropdownItem
              v-for="item in othersItem"
              :key="item.href"
              :class="{ 'doc-type-dropdown-active': nodeStore.manualNode?.label === item.title, 'o-dropdown-item-en': locale === 'en' }"
              :style="{ '--dropdown-item-color-hover': 'var(--o-color-info2)' }"
              @click="onClickItem(item.href)"
            >
              {{ item.title }}
            </ODropdownItem>
          </template>
        </OScroller>
      </template>
    </ODropdown>
  </div>
</template>

<style lang="scss" scoped>
.doc-type-wrap {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--o-color-info1);

  @include hover {
    .doc-type-text {
      color: var(--o-color-info2);
    }
  }
}

.icon {
  font-size: 24px;
}

.doc-type {
  max-width: 240px;
  margin-right: 8px;
  color: var(--o-color-info1);
  font-weight: 500;
  @include text-truncate(1);
  @include text2;

  @include respond-to('<=laptop') {
    max-width: 170px;
  }
}

.doc-type-scroller {
  max-height: 320px;

  :deep(.o-scrollbar-y) {
    --scrollbar-y-right: -4px;
  }
}

.doc-type-small-title {
  padding: 8px 12px 4px;
  color: var(--o-color-info3);
  @include tip2;
}

.o-dropdown {
  display: inline-block;
  margin-bottom: 8px;
  @include respond-to('<=laptop') {
    margin-bottom: 0;
  }
}

.o-dropdown-item {
  @include text1;
  min-width: 200px;
  white-space: nowrap;
  --dropdown-item-justify: flex-start;
  --dropdown-item-padding: 7px 12px;
  @include hover {
    background-color: var(--o-color-control2-light);
  }
}

.o-dropdown-item-en {
  min-width: 248px;
}

.doc-type-dropdown-active {
  color: var(--o-color-primary1);
  background-color: var(--o-color-control3-light);
  @include hover {
    color: var(--o-color-primary1);
    background-color: var(--o-color-control3-light);
  }
}
</style>
