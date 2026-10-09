import { ref, watchEffect } from 'vue';

import { useLocale } from '@/composables/useLocale';

import footerZh from '@/config/footer-data/zh.json';
import footerEn from '@/config/footer-data/en.json';

import type { FooterJsonT } from '@/@types/type-footer-json';

const FOOTER_JSON: Record<string, FooterJsonT> = {
  zh: footerZh as FooterJsonT,
  en: footerEn as FooterJsonT,
};

// 模块级单例：多组件（AppFooter/DocFooter）共享同一份数据与 fetch
const footerData = ref<FooterJsonT>(FOOTER_JSON.zh);
let inited = false;
// fetchSeq：locale 快速切换时丢弃过期的异步结果
let fetchSeq = 0;

const fetchFooter = async (loc: string) => {
  const seq = ++fetchSeq;
  try {
    // 直连官网共享数据（官网 /footer/ 已配 Access-Control-Allow-Origin 解决跨域；
    // 域名随环境：app/.env=test 官网、app/.env.production=生产官网）
    const res = await fetch(`${import.meta.env.VITE_MAIN_DOMAIN_URL}/footer/${loc}.json`);
    if (res.ok) {
      const data = (await res.json()) as FooterJsonT;
      if (seq !== fetchSeq) return;
      footerData.value = data;
    } else {
      // 拉取失败回退构建期副本（scripts/fetch-footer-json.js 下载）
      footerData.value = FOOTER_JSON[loc] ?? FOOTER_JSON.zh;
    }
  } catch {
    footerData.value = FOOTER_JSON[loc] ?? FOOTER_JSON.zh;
  }
};

/**
 * 页脚共享数据（官网 JSON）：
 * 构建期 JSON 先渲染（SSG/首屏完整页脚），随后无条件重新 fetch 线上 JSON 刷新
 */
export const useFooterData = () => {
  const { locale } = useLocale();

  if (!inited) {
    inited = true;
    watchEffect(() => {
      const loc = locale.value;
      footerData.value = FOOTER_JSON[loc] ?? FOOTER_JSON.zh;
      void fetchFooter(loc);
    });
  }

  return { footerData };
};
