<script setup lang="ts">
import { computed } from 'vue';

import { OFooter } from '@opendesign-plus/components';

import { useFooterData } from '@/composables/useFooterData';
import { getYearByOffset } from '@/utils/common';

const { footerData } = useFooterData();

const baseUrl = import.meta.env.VITE_MAIN_DOMAIN_URL;

// 官网 JSON 中链接为完整 URL（env 烙死）或官网站内相对路径，相对路径补官网域名
const toUrl = (href: string) => (href.includes('http') ? href : `${baseUrl}${href}`);

const footerOption = computed(() => ({
  ...footerData.value.footerOption,
  copyright: footerData.value.footerOption.copyright.replace(
    '{year}',
    String(getYearByOffset())
  ),
  children: footerData.value.footerOption.children.map((item) => ({
    title: item.title,
    href: toUrl(item.href),
  })),
}));
</script>

<template>
  <OFooter simple :footer-option="footerOption" />
</template>

<style lang="scss" scoped>

</style>
