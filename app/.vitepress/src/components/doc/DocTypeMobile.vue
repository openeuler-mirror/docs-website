<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vitepress';
import { OIcon, ODialog, useMessage } from '@opensig/opendesign';

import IconChevronDown from '~icons/app/icon-chevron-down.svg';

import { HOME_CONFIG, HOME_CONFIG_EN } from '@/config/dsl';
import { useLocale } from '@/composables/useLocale';
import { useNodeStore } from '@/stores/node';
import { isElementVisible } from '@/utils/element';
import { getVersionFromUrl } from '@/utils/common';
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
const { t, locale } = useLocale();
const showDlg = ref(false);

const config = computed(() => {
  return locale.value === 'zh' ? HOME_CONFIG : HOME_CONFIG_EN;
});

const othersItem = computed(() => {
  return config.value.recommend.items.filter((item) => item.dropdown);
});

watch(showDlg, (val) => {
  if (val) {
    setTimeout(() => {
      const scroller = document.querySelector<HTMLElement>('.docs-type-dialog .o-scroller > .o-scroller-container');
      const el = document.querySelector<HTMLElement>('.docs-type-dialog .doc-item-active-mb');
      if (scroller && el && !isElementVisible(el, scroller)) {
        el.scrollIntoView();
      }
    });
  }
});

const getVersionHref = (href: string) => {
  const arr = href.split('/');
  arr[3] = props.version;
  return arr.join('/');
};

const isActive = (href: string) => {
  return nodeStore.moduleNode?.href === getVersionHref(href);
};

const onClickItem = async (href: string) => {
  const newHref = route.path.includes('/docs/common/') || href.includes('/docs/common/') ? href : getVersionHref(href);
  if (nodeStore.moduleNode?.href === newHref) {
    return;
  }

  if (await isPageExist(newHref)) {
    const currentVersion = getVersionFromUrl(route.path);
    const hrefVersion = getVersionFromUrl(newHref);
    if (currentVersion === hrefVersion) {
      router.go(newHref);
    } else {
      window.location.href = newHref;
    }

    showDlg.value = false;
    emits('refresh');
    return;
  }

  message.info({
    content: '暂无对应版本的文档内容',
  });
};
</script>

<template>
  <div class="doc-type-mb" @click="showDlg = true">
    <p class="text">{{ nodeStore.moduleNode?.label }}</p>
    <OIcon class="icon"><IconChevronDown /></OIcon>
  </div>

  <ODialog v-model:visible="showDlg" :phone-half-full="true" class="docs-type-dialog">
    <template #header>
      <div class="title-header">
        <p class="title">{{ t('home.selectScenarioOrTool') }}</p>
      </div>
    </template>

    <template v-for="item in config.sections" :key="item.title">
      <div class="doc-type-small-title-mb">{{ item.title }}</div>
      <div
        v-for="subItem in item.items"
        :key="subItem.href"
        class="doc-item-mb"
        :class="{ 'doc-item-active-mb': isActive(subItem.href) }"
        @click="onClickItem(subItem.href)"
      >
        {{ subItem.title }}
      </div>
    </template>

    <template v-if="othersItem.length">
      <div class="doc-type-small-title-mb">{{ config.recommend.title }}</div>
      <div
        v-for="item in othersItem"
        :key="item.href"
        class="doc-item-mb"
        :class="{ 'doc-item-active-mb': nodeStore.manualNode?.label === item.title }"
        @click="onClickItem(item.href)"
      >
        {{ item.title }}
      </div>
    </template>

    <div class="bottom-empty"></div>
  </ODialog>
</template>

<style lang="scss">
.docs-type-dialog {
  .o-dlg-main {
    --dlg-max-height: 446px;
    margin: 24px;
  }

  .o-dlg-header {
    --dlg-head-padding: 16px 16px 0 16px;
  }

  .o-dlg-body {
    --dlg-body-padding: 12px 16px 0;
  }

  :deep(.o-dlg-header + .o-dlg-body) {
    --dlg-padding-body-top: 0;
  }
}
</style>

<style lang="scss" scoped>
.doc-type-mb {
  display: inline-flex;
  margin-left: 8px;
  @include h3;
}

.icon {
  margin-left: 8px;
  font-size: 24px;
}

.doc-type-small-title-mb {
  padding: 12px 0;
  font-weight: 500;
  color: var(--o-color-info1);
  @include h4;
}

.doc-item-mb {
  padding: 14px 16px;
  color: var(--o-color-info1);
  border-radius: var(--o-radius-xs);
  @include h4;
}

.doc-item-active-mb {
  color: var(--o-color-primary1);
  background-color: var(--o-color-control3-light);
}

.bottom-empty {
  padding-bottom: 16px;
}
</style>
