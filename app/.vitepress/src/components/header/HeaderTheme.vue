<script lang="ts" setup>
import { computed, onMounted, watch } from 'vue';
import { OIcon } from '@opensig/opendesign';

import { ElSwitch } from 'element-plus';

import { useAppearance } from '@/stores/common';
import { useScreen } from '@/composables/useScreen';
import { setCustomCookie, getCustomCookie } from '@/shared/cookie';

import IconSun from '~icons/app/icon-sun-outline.svg';
import IconMoon from '~icons/app/icon-header-moon.svg';

// 风格切换
const APPEARANCE_KEY = 'openEuler-theme-appearance';

const appearanceStore = useAppearance();
const { lePadV } = useScreen();
const isLight = computed(() => (appearanceStore.theme === 'light' ? true : false));

const changeTheme = () => {
  const theme = appearanceStore.theme === 'dark' ? 'light' : 'dark';
  appearanceStore.theme = theme;
  setCustomCookie(APPEARANCE_KEY, theme, 180, import.meta.env.VITE_COOKIE_DOMAIN);
};

const changeThemeMobile = () => {
  setCustomCookie(APPEARANCE_KEY, appearanceStore.theme, 180, import.meta.env.VITE_COOKIE_DOMAIN);
};

onMounted(() => {
  let theme;
  if (!getCustomCookie(APPEARANCE_KEY)) {
    const prefereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefereDark ? 'dark' : 'light';
  } else {
    theme = getCustomCookie(APPEARANCE_KEY);
  }
  appearanceStore.theme = theme === 'dark' ? 'dark' : 'light';
});

watch(
  () => {
    return appearanceStore.theme;
  },
  (val) => {
    const documentElement = document.documentElement;
    if (val === 'dark') {
      documentElement.setAttribute('data-o-theme', 'dark');
      documentElement.classList.add('dark');
    } else {
      documentElement.removeAttribute('data-o-theme');
      documentElement.classList.remove('dark');
    }
  },
  {
    immediate: true,
  }
);
</script>

<template>
  <div v-if="lePadV" class="theme-box-mobile">
    <el-switch
      v-model="appearanceStore.theme"
      active-value="dark"
      inactive-value="light"
      inline-prompt
      style="--el-switch-on-color: #002fa7; --el-switch-off-color: #e5e8f0"
      :active-icon="IconSun"
      :inactive-icon="IconMoon"
      @click="changeThemeMobile"
    />
  </div>
  <div v-else class="theme-box-pc" @click="changeTheme">
    <OIcon class="icon">
      <IconMoon v-if="isLight" />
      <IconSun v-else />
    </OIcon>
  </div>
</template>

<style lang="scss" scoped>
.theme-box-pc {
  display: flex;
  align-items: center;
  height: 100%;
  cursor: pointer;
  color: var(--o-color-info1);
  .icon {
    font-size: var(--o-icon_size-m);
    @include hover {
      color: var(--o-color-primary1);
    }
  }
  @include respond-to('<=pad_v') {
    display: none;
  }
}
.theme-box-mobile {
  display: none;

  @include respond-to('<=pad_v') {
    display: block;
  }
}
:deep(.el-switch__inner) {
  .is-show {
    color: var(--o-color-info1);
  }
}
</style>
