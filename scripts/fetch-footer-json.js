/**
 * 构建前下载官网部署的 footer JSON 到 src/config/footer-data/，
 * 供 useFooterData 静态 import，实现页脚数据构建期固化（SSG 可渲染）。
 *
 * 失败语义：拉取失败不影响后续流程（不阻塞构建）——
 * 有本地副本则沿用副本，无副本则写入空兜底 JSON（保证静态 import 始终存在，
 * 页脚空渲染，待运行时 fetch 成功后由 useFooterData 刷新）。
 *
 * 环境变量：
 * - FOOTER_JSON_BASE：JSON 基地址，默认 https://www.openeuler.org
 * - FOOTER_LOCALES：逗号分隔语言列表，默认 zh,en
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'app/.vitepress/src/config/footer-data');
const base = (process.env.FOOTER_JSON_BASE || 'https://www.openeuler.org').replace(/\/+$/, '');
const locales = (process.env.FOOTER_LOCALES || 'zh,en').split(',').map((s) => s.trim()).filter(Boolean);

// 空兜底 JSON：字段结构与 FooterJsonT 对齐（空值），保证 useFooterData 静态 import 可用
const EMPTY_FALLBACK = {
  info: { title: '', logo: '', href: '' },
  quickNav: [],
  qrcode: [],
  friendshipLink: { title: '', children: [] },
  footerLogo: { logo: '', email: '' },
  footerOption: {
    children: [],
    licenseText: '',
    licenseInfo: '',
    copyright: '',
    beianInfo1: '',
    beianInfo2: '',
    beianLink: '',
    policeIcon: '',
  },
  footer_bg_img: { pc: '', mb: '' },
};

for (const loc of locales) {
  const url = `${base}/footer/${loc}.json`;
  const outFile = resolve(outDir, `${loc}.json`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    JSON.parse(text); // 校验合法 JSON
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, text, 'utf8');
    console.log(`[fetch-footer-json] ${url} -> ${outFile.slice(root.length + 1)}`);
  } catch (err) {
    if (existsSync(outFile)) {
      console.warn(`[fetch-footer-json] 拉取失败(${err.message})，使用已有本地副本 ${outFile.slice(root.length + 1)}`);
    } else {
      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, JSON.stringify(EMPTY_FALLBACK, null, 2), 'utf8');
      console.warn(`[fetch-footer-json] 拉取失败(${err.message})且无本地副本，写入空兜底 JSON（页脚空渲染，待运行时刷新）`);
    }
  }
}
