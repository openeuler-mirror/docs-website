<script setup lang="ts">
import type { PropType } from 'vue';
import { ODivider } from '@opensig/opendesign';

import { useLocale } from '@/composables/useLocale';
import { linksData2, filingData } from '@/config/footer';
import { getYearByOffset } from '@/utils/common';

defineProps({
  lang: {
    type: String as PropType<'zh' | 'en'>,
    default: 'zh',
  },
  target: {
    type: String,
    default: '_blank',
  },
});

const baseUrl = import.meta.env.VITE_MAIN_DOMAIN_URL;
const { t } = useLocale();
</script>

<template>
  <div class="app-footer-pc">
    <div class="footer-left">
      <p class="license">
        <span>{{ t('footer.license_1') }}</span>
        {{ t('footer.license_2') }}
      </p>
      <div class="second-line">
        <span>{{ t('footer.copyRight', [getYearByOffset()]) }}</span>
        <a class="approval" :href="filingData.link" target="_blank" rel="noopener noreferrer">{{ t('footer.filingText1') }}</a>
        <img class="police-img" :src="filingData.icon" />
        <span>{{ t('footer.filingText2') }}</span>
      </div>
    </div>

    <div class="footer-right">
      <template v-for="(link, index) in linksData2[lang]" :key="link.URL">
        <a :target="target" :href="link.URL.includes('http') ? link.URL : `${baseUrl}${link.URL}`" class="link">{{ link.NAME }}</a>
        <ODivider v-if="index !== linksData2[lang].length - 1" direction="v" />
      </template>
    </div>
  </div>

  <div class="app-footer-mb">
    <div class="links">
      <template v-for="(link, index) in linksData2[lang]" :key="link.URL">
        <a :target="target" :href="link.URL.includes('http') ? link.URL : `${baseUrl}${link.URL}`" class="link">{{ link.NAME }}</a>
        <ODivider v-if="index !== linksData2[lang].length - 1" direction="v" />
      </template>
    </div>

    <div class="license">{{ t('footer.license_1') }}{{ t('footer.license_2') }}</div>
    <div class="copyright">{{ t('footer.copyRight', [getYearByOffset()]) }}</div>
    <div class="approval">
      <a :href="filingData.link" target="_blank" rel="noopener noreferrer">{{ t('footer.filingText1') }}</a>
      <img class="police-img" :src="filingData.icon" />
      <span>{{ t('footer.filingText2') }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-footer-pc {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  margin-top: 12px;
  color: var(--o-color-info3);
  @include tip1;

  @include respond-to('<=pad') {
    display: none;
  }

  @include respond-to('<=laptop') {
    padding: 0 24px;
  }

  @media screen and (max-width: 1600px) {
    font-size: 12px;
    line-height: 18px;
  }

  @media screen and (max-width: 1300px) {
    font-size: 10px;
    line-height: 18px;
  }

  .footer-left {
    display: flex;
    flex-direction: column;
  }

  .second-line {
    display: flex;
    align-items: center;
    margin-top: 2px;
  }

  .approval {
    margin-left: 8px;
  }

  :deep(.o-divider) {
    --o-divider-bd-color: rgba(var(--o-black), 0.1);
  }

  a {
    color: var(--o-color-info3);

    @include hover {
      color: var(--o-color-link1);
    }
  }
}

.app-footer-mb {
  display: none;
  margin-top: 16px;
  text-align: center;
  font-size: 10px;
  color: var(--o-color-info4);
  @include tip1;

  @include respond-to('<=pad') {
    display: block;
  }

  @include respond-to('phone') {
    font-size: 10px;
  }

  .license {
    margin-top: 12px;
  }

  .copyright {
    margin-top: 4px;
  }

  .approval {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 4px;
  }

  a {
    color: var(--o-color-info4);

    @include hover {
      color: var(--o-color-link1);
    }
  }
}

.police-img {
  width: 16px;
  height: 16px;
  margin: 0 8px;
}

@include in-dark {
  .app-footer {
    :deep(.o-divider) {
      --o-divider-bd-color: rgba(var(--o-white), 0.1);
    }
  }
}
</style>
