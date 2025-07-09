<script setup lang="ts">
import { computed, ref } from 'vue';
import { OIcon } from '@opensig/opendesign';
import { useData } from 'vitepress';

import { useScreen } from '@/composables/useScreen';
import { useAppearance } from '@/stores/common';

import ContentWrapper from '@/components/ContentWrapper.vue';
import HeaderNav from '@/components/header/HeaderNav.vue';
import HeaderNavMoblie from '@/components/header/HeaderNavMoblie.vue';

import logo_light from '@/assets/category/header/logo.svg';
import logo_dark from '@/assets/category/header/logo_dark.svg';
import IconClose from '~icons/app/icon-close.svg';
import IconMenu from '~icons/app/icon-header-menu.svg';

const { lang } = useData();
const { lePadV } = useScreen();

const langShow = ref(['zh', 'en']);

const appearanceStore = useAppearance();
// Logo主题判断
const logoUrl = computed(() => (appearanceStore.theme === 'light' ? logo_light : logo_dark));

// 返回首页
const goHome = () => {
  menuShow.value = false;
  window.location.href = `${import.meta.env.VITE_MAIN_DOMAIN_URL}/${lang.value}/`;
};

const mobileNav = ref();
const menuShow = ref(false);
const menuPanel = () => {
  setTimeout(() => {
    menuShow.value = !menuShow.value;
  }, 200);
};

const mobileClick = () => {
  menuPanel();
};
</script>

<template>
  <header class="app-header" :class="[{ dark: appearanceStore.theme === 'dark' }]">
    <ContentWrapper class="app-header-wrap">
      <div v-if="lePadV" class="menu-icon">
        <div class="icon" @click="menuPanel">
          <OIcon>
            <IconMenu v-if="!menuShow" />
            <IconClose v-else />
          </OIcon>
        </div>
      </div>
      <img class="logo" alt="openEuler logo" :src="logoUrl" @click="goHome" />
      <ClientOnly>
        <HeaderNavMoblie v-if="lePadV" ref="mobileNav" :lang-options="langShow" :menuShow="menuShow" @link-click="mobileClick" />
        <HeaderNav v-else :lang-options="langShow" />
      </ClientOnly>
    </ContentWrapper>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  background-color: var(--o-color-fill2);
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 1998;
  box-shadow: var(--o-shadow-1);
  backdrop-filter: blur(5px);

  @include respond-to('>pad_v') {
    &.dark {
      &:after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 1px;
        background-color: var(--o-color-control4);
      }
    }

    &:before {
      bottom: 0;
      box-shadow: var(--o-shadow-1);
      content: '';
      left: 0;
      pointer-events: none;
      position: absolute;
      right: 0;
      top: 0;
      z-index: 100;
    }
  }

  @include respond-to('phone') {
    box-shadow: none;
  }

  .app-header-wrap {
    display: flex;
    align-items: center;
    @include respond-to('>pad_v') {
      height: 80px;
    }
    @include respond-to('<=pad_v') {
      height: 48px;
      justify-content: space-between;
      position: relative;
    }
  }
}

.logo {
  cursor: pointer;

  @include respond-to('>pad_v') {
    height: 32px;
    width: 136px;
    margin-right: var(--o-gap-7);

    @include respond-to('laptop') {
      margin-right: 28px;
    }
    @include respond-to('pad_h') {
      margin-right: var(--o-gap-2);
    }
  }
  @include respond-to('<=pad_v') {
    height: 24px;
    width: 136px;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 12px;
  }
}

.menu-icon {
  flex: 1;
  display: block;
  .icon {
    font-size: var(--o-icon_size-m);
    color: var(--o-color-info1);
    height: 24px;
    cursor: pointer;
    svg {
      width: var(--o-icon_size-m);
    }
  }
}

html[lang='en'] {
  .logo {
    @media (min-width: 841px) and (max-width: 1000px) {
      width: 100px;
    }
  }
}
</style>
