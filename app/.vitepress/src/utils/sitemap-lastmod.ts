import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** sitemap lastmod 侧车文件：`版本::locale/页面路径.md -> ISO 时间` */
type LastmodStore = Record<string, string>;

/** sitemap 条目最小结构（兼容 VitePress SitemapItem） */
interface SitemapLikeItem {
  url: string;
  lastmod?: string;
}

const moduleDir = dirname(fileURLToPath(import.meta.url));

// 侧车文件由 scripts/clone-docs.js / merge.js / merge-upstream.js 在复制文档时生成，可用环境变量覆盖
const LASTMOD_SIDECAR_PATH = process.env.DOCS_LASTMOD_FILE || resolve(moduleDir, '../../../../.cache/docs-lastmod.json');

let lastmodLookupCache: Map<string, string> | null = null;

/**
 * 惰性读取 lastmod sidecar，构建 `版本::locale/页面路径.md -> 最后提交时间` 映射
 * 文件缺失或读取失败时返回空表，由调用方回退为构建时间
 * @returns 版本::路径 -> 提交时间(ISO)
 */
function loadLastmodLookup(): Map<string, string> {
  if (lastmodLookupCache) {
    return lastmodLookupCache;
  }

  const lookup = new Map<string, string>();
  lastmodLookupCache = lookup;

  if (!existsSync(LASTMOD_SIDECAR_PATH)) {
    console.log(`[sitemap] 未找到提交时间侧车文件（${LASTMOD_SIDECAR_PATH}），lastmod 回退为构建时间`);
    return lookup;
  }

  try {
    const content = JSON.parse(readFileSync(LASTMOD_SIDECAR_PATH, 'utf-8')) as LastmodStore;
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      console.log(`[sitemap] 提交时间侧车文件格式无效，lastmod 回退为构建时间：${LASTMOD_SIDECAR_PATH}`);
      return lookup;
    }

    for (const [key, value] of Object.entries(content)) {
      if (typeof value === 'string' && value) {
        lookup.set(key, value);
      }
    }

    console.log(`[sitemap] 已加载提交时间 ${lookup.size} 条（文件：${LASTMOD_SIDECAR_PATH}）`);
  } catch (err) {
    console.log(`[sitemap] 读取提交时间侧车文件失败，lastmod 回退为构建时间：${(err as Error).message}`);
  }

  return lookup;
}

/**
 * 构造页面 URL 到 sidecar key 的候选项，兼容目录 index 页面
 * @param branch 版本目录名
 * @param locale 语言
 * @param pagePath 页面路径
 * @returns 候选 key 列表
 */
function buildLastmodKeys(branch: string, locale: string, pagePath: string): string[] {
  if (!pagePath) {
    return [`${branch}::${locale}/index.md`];
  }

  const dirPath = pagePath.replace(/\/index$/, '');
  const keys = [`${branch}::${locale}/${pagePath}.md`];
  if (dirPath !== pagePath) {
    keys.push(`${branch}::${locale}/${dirPath}.md`, `${branch}::${locale}/${dirPath}/index.md`);
  } else {
    keys.push(`${branch}::${locale}/${dirPath}/index.md`);
  }

  return keys;
}

/**
 * VitePress transformItems 可能传入相对路径，也可能传入绝对 URL，统一拿到 pathname
 * @param url sitemap item.url
 * @returns URL pathname，解析失败返回空串
 */
function getSitemapPathname(url: string): string {
  const isAbsoluteUrl = /^[a-z][a-z\d+\-.]*:\/\//i.test(url);
  const target = isAbsoluteUrl ? url : `http://localhost${url.startsWith('/') ? url : `/${url}`}`;

  try {
    // URL 的 pathname 会对非 ASCII（如中文文件名）做百分号编码，而侧车文件存的是原始 UTF-8 路径，需解码后再匹配
    return decodeURIComponent(new URL(target).pathname);
  } catch {
    return '';
  }
}

/**
 * 由 sitemap 页面 URL 反推站点内 md 路径并查表得到最后提交时间
 * @param url sitemap item.url，可能是相对路径或完整 URL
 * @param lookup 版本::路径 -> 提交时间
 * @returns 命中返回 ISO 时间，未命中返回空串
 */
function resolveSitemapLastmod(url: string, lookup: Map<string, string>): string {
  if (lookup.size === 0) {
    return '';
  }

  const pathname = getSitemapPathname(url);
  if (!pathname) {
    return '';
  }

  // 站点 URL 结构：/<locale>/docs/<版本目录名>/<页面路径>.html，locale 仅 zh、en
  const matched = /^\/(zh|en)\/docs\/([^/]+)\/(.*)$/.exec(pathname);
  if (!matched) {
    return '';
  }

  const [, locale, branch, rest] = matched;
  const pagePath = rest.replace(/\.html$/, '').replace(/\/$/, '');

  for (const key of buildLastmodKeys(branch, locale, pagePath)) {
    const value = lookup.get(key);
    if (value) {
      return value;
    }
  }

  return '';
}

/**
 * 为 sitemap 条目回填 lastmod：优先使用构建期收集的页面最后提交时间，未命中则回退为构建时间
 * @param items VitePress sitemap 条目列表
 * @returns 处理后的条目列表（原地修改并返回同一数组）
 */
export function applySitemapLastmod<T extends SitemapLikeItem>(items: T[]): T[] {
  const lookup = loadLastmodLookup();
  const buildTime = new Date().toISOString();

  for (const item of items) {
    item.lastmod = resolveSitemapLastmod(item.url, lookup) || buildTime;
  }

  return items;
}
