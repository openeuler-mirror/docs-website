<script setup lang="ts">
import { computed } from 'vue';

import { OFooter } from '@opendesign-plus/components';

import { useFooterData } from '@/composables/useFooterData';
import { useScreen } from '@/composables/useScreen';
import { useViewStore } from '@/stores/view';
import { getYearByOffset } from '@/utils/common';

const { lePadV } = useScreen();
const { footerData } = useFooterData();
const viewStore = useViewStore();

const baseUrl = import.meta.env.VITE_MAIN_DOMAIN_URL;

// 官网 JSON 中链接为完整 URL（env 烙死）或官网站内相对路径，相对路径补官网域名
const toUrl = (href: string) => (href.includes('http') ? href : `${baseUrl}${href}`);

const quickNav = computed(() =>
  footerData.value.quickNav.map((group) => ({
    title: group.title,
    children: group.children.map((item) => ({
      title: item.title,
      href: toUrl(item.href),
    })),
  }))
);

const footerOption = computed(() => ({
  ...footerData.value.footerOption,
  copyright: footerData.value.footerOption.copyright.replace('{year}', String(getYearByOffset())),
  children: footerData.value.footerOption.children.map((item) => ({
    title: item.title,
    href: toUrl(item.href),
  })),
}));

const footerBg = computed(() => {
  if (lePadV.value) {
    return footerData.value.footer_bg_img.mb;
  }
  return footerData.value.footer_bg_img.pc;
});
</script>

<template>
  <!-- 仅首页渲染：App.vue 中为全局挂载，文档详情页由 LayoutDoc 的 DocFooter 负责 -->
  <footer v-if="viewStore.isHomeView || viewStore.isCustomView" id="tour_footer" class="footer">
    <OFooter
      :info="footerData.info"
      :quick-nav="quickNav"
      :friendship-link="footerData.friendshipLink"
      :footer-logo="footerData.footerLogo"
      :footer-option="footerOption"
      :qrcode="footerData.qrcode"
      :footer-bg-img="footerBg"
    />
  </footer>
</template>

<style lang="scss" scoped></style>
