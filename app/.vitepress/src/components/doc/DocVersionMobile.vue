<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vitepress';
import { OIcon, ODialog, ORadioGroup, ORadio, OToggle, OButton, ODivider, useMessage } from '@opensig/opendesign';

import IconChevronDown from '~icons/app/icon-chevron-down.svg';

import { versions } from '@/config/version';
import { useLocale } from '@/composables/useLocale';
import { isPageExist } from '@/api/api-common';

const props = defineProps({
  version: {
    type: String,
    default: '',
  },
});

const { t, locale } = useLocale();
const route = useRoute();
const message = useMessage();

const radioVersionValue = ref(props.version);
const versionVisible = ref(false);

watch(versionVisible, (val) => {
  if (!val) {
    radioVersionValue.value = props.version;
  }
});

const confirmVersion = async () => {
  versionVisible.value = false;
  const item = versions[locale.value].find((item) => item.value === radioVersionValue.value);
  if (!item) {
    return;
  }

  if (item?.href) {
    window.open(item.href, '_blank', 'noopener noreferrer');
    return false;
  }

  const path = route.path.endsWith('/') ? `${route.path}index.html` : route.path;
  const arr = path.split('/');
  arr[3] = item.value;

  if (await isPageExist(arr.join('/'))) {
    window.open(arr.join('/'), '_blank', 'noopener noreferrer');
  } else {
    message.info({
      content: '暂无对应版本的文档内容',
    });
  }
};

const resetVersion = () => {
  radioVersionValue.value = props.version;
};
</script>

<template>
  <div class="version-wrap" @click="versionVisible = true">
    <span class="version-title">{{ t('docs.version') }}</span>
    <span class="version-text">{{ version.replace(/_/g, ' ') }}</span>
    <OIcon class="icon"><IconChevronDown /></OIcon>
  </div>

  <!-- 移动端版本弹窗 -->
  <ODialog v-model:visible="versionVisible" :phone-half-full="true" class="docs-version-dialog">
    <template #header>
      <div class="title-header">
        <p class="title">{{ t('docs.versionFilter') }}</p>
      </div>
    </template>
    <div>
      <p class="version-title-mb">{{ t('docs.version1') }}</p>
      <ORadioGroup class="filter-options" v-model="radioVersionValue" :style="{ gap: '8px' }">
        <ORadio v-for="option in versions[locale]" :key="option.value" :value="option.value">
          <template #radio="{ checked }">
            <OToggle
              :class="{ active: checked }"
              :style="{ '--toggle-size': '28px', '--toggle-padding': '6px 16px', '--toggle-radius': '4px' }"
              :checked="checked"
            >
              {{ option.label }}</OToggle
            >
          </template>
        </ORadio>
      </ORadioGroup>
    </div>
    <div class="btn">
      <OButton color="normal" variant="text" size="large" @click="resetVersion">{{ t('docs.resetTitle') }}</OButton>
      <ODivider class="divider-btn" direction="v" />
      <OButton color="normal" variant="text" size="large" @click="confirmVersion">{{ t('docs.confirmTitle') }}</OButton>
    </div>
  </ODialog>
</template>

<style lang="scss" scoped>
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
  @include text1;
}

.version-text {
  @include text1;
  margin-right: 8px;
}

.version-title-mb {
  @include text2;
  color: var(--o-color-info1);
  font-weight: 500;
  margin-bottom: 12px;
}

.filter-options {
  --radio-group-gap: 0;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  .o-btn {
    --btn-bg-color-hover: none;
    --btn-bg-color-active: none;
    --btn-padding: 0 50px;
    --btn-color: var(--o-color-info1);
    font-weight: 500;
  }
}
</style>
