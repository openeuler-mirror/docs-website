import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import matter from 'gray-matter';

/** sitemap lastmod 侧车文件：`版本::locale/页面路径.md -> ISO 时间` */
type LastmodStore = Record<string, string>;

/** sitemap 条目最小结构（兼容 VitePress SitemapItem） */
interface SitemapLikeItem {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

/** 文档页 sitemap URL 解析结果 */
interface SitemapDocsUrl {
  /** 语言（zh / en） */
  locale: string;
  /** 版本目录名 */
  branch: string;
  /** 页面路径（去掉 .html 与结尾斜杠，版本根目录时为空串） */
  pagePath: string;
}

/** 协议允许的 changefreq 取值 */
const CHANGEFREQ_VALUES = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

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
 * 由 sitemap 页面 URL 反推站点内文档路径段
 * 站点 URL 结构：/<locale>/docs/<版本目录名>/<页面路径>.html，locale 仅 zh、en
 * @param url sitemap item.url，可能是相对路径或完整 URL
 * @returns 解析结果，非文档页 URL 或解析失败返回 null
 */
function parseSitemapDocsUrl(url: string): SitemapDocsUrl | null {
  const pathname = getSitemapPathname(url);
  if (!pathname) {
    return null;
  }

  const matched = /^\/(zh|en)\/docs\/([^/]+)\/(.*)$/.exec(pathname);
  if (!matched) {
    return null;
  }

  const [, locale, branch, rest] = matched;

  return { locale, branch, pagePath: rest.replace(/\.html$/, '').replace(/\/$/, '') };
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

  const page = parseSitemapDocsUrl(url);
  if (!page) {
    return '';
  }

  for (const key of buildLastmodKeys(page.branch, page.locale, page.pagePath)) {
    const value = lookup.get(key);
    if (value) {
      return value;
    }
  }

  return '';
}

/**
 * 构造页面 URL 到源 md 文件相对路径的候选项，兼容目录 index 页面
 * @param locale 语言
 * @param branch 版本目录名
 * @param pagePath 页面路径
 * @returns 相对 srcDir 的 md 路径候选列表
 */
function buildMdCandidates(locale: string, branch: string, pagePath: string): string[] {
  const docsDir = `${locale}/docs/${branch}`;

  // 版本根目录 URL 对应 locale 下的 index.md
  if (!pagePath) {
    return [`${docsDir}/index.md`];
  }

  const dirPath = pagePath.replace(/\/index$/, '');
  const candidates = [`${docsDir}/${pagePath}.md`];
  if (dirPath !== pagePath) {
    candidates.push(`${docsDir}/${dirPath}.md`, `${docsDir}/${dirPath}/index.md`);
  } else {
    candidates.push(`${docsDir}/${dirPath}/index.md`);
  }

  return Array.from(new Set(candidates));
}

/**
 * 将 frontmatter 原始值归一化为合法 changefreq，非法或未声明返回空串
 * @param raw frontmatter 中的 changefreq 原始值
 * @param url sitemap item.url，仅用于告警定位
 * @returns 合法取值或空串
 */
function normalizeChangefreq(raw: unknown, url: string): string {
  // 未声明时静默跳过，不产出 changefreq
  if (raw === undefined || raw === null || raw === '') {
    return '';
  }

  const value = String(raw).trim().toLowerCase();

  // 声明了但不是协议允许的值时忽略，避免产出非法 sitemap
  if (!CHANGEFREQ_VALUES.includes(value)) {
    console.warn(`[sitemap] changefreq 取值非法，已忽略：${url} -> ${String(raw)}`);
    return '';
  }

  return value;
}

/**
 * 将 frontmatter 原始值归一化为合法 priority（0~1），非法或未声明返回 null
 * @param raw frontmatter 中的 priority 原始值
 * @param url sitemap item.url，仅用于告警定位
 * @returns 合法数值或 null
 */
function normalizePriority(raw: unknown, url: string): number | null {
  // 未声明时静默跳过，不产出 priority
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }

  const value = typeof raw === 'number' ? raw : Number(String(raw).trim());

  // 非数字或超出协议范围时忽略
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    console.warn(`[sitemap] priority 取值非法，已忽略：${url} -> ${String(raw)}`);
    return null;
  }

  return value;
}

/**
 * 读取源 md 文件 frontmatter 中声明的 changefreq / priority
 * @param filePath 源 md 文件绝对路径
 * @param url sitemap item.url，仅用于告警定位
 * @returns 归一化后的元数据，读取失败返回空对象
 */
function readFrontmatterMetadata(filePath: string, url: string): { changefreq?: string; priority?: number } {
  try {
    const { data } = matter(readFileSync(filePath, 'utf-8'));
    const metadata: { changefreq?: string; priority?: number } = {};

    const changefreq = normalizeChangefreq(data.changefreq, url);
    if (changefreq) {
      metadata.changefreq = changefreq;
    }

    const priority = normalizePriority(data.priority, url);
    if (priority !== null) {
      metadata.priority = priority;
    }

    return metadata;
  } catch (err) {
    console.warn(`[sitemap] 读取 frontmatter 失败，跳过 changefreq/priority：${url} -> ${(err as Error).message}`);
    return {};
  }
}

/**
 * 为 sitemap 条目回填元数据：
 * lastmod 优先使用构建期收集的页面最后提交时间（未命中回退为构建时间）；
 * changefreq / priority 在源 md 文件 frontmatter 声明时直接取用，未声明则不输出该字段
 * @param items VitePress sitemap 条目列表
 * @param srcDir VitePress srcDir（app 目录）
 * @returns 处理后的条目列表（原地修改并返回同一数组）
 */
export function applySitemapMetadata<T extends SitemapLikeItem>(items: T[], srcDir: string): T[] {
  const lookup = loadLastmodLookup();
  const buildTime = new Date().toISOString();

  for (const item of items) {
    item.lastmod = resolveSitemapLastmod(item.url, lookup) || buildTime;

    const page = parseSitemapDocsUrl(item.url);

    // 非文档页 URL（如站点首页）不含 frontmatter 元数据
    if (!page) {
      continue;
    }

    for (const candidate of buildMdCandidates(page.locale, page.branch, page.pagePath)) {
      const filePath = resolve(srcDir, candidate);

      // 命中第一个存在的源文件即取其 frontmatter
      if (existsSync(filePath)) {
        Object.assign(item, readFrontmatterMetadata(filePath, item.url));
        break;
      }
    }
  }

  return items;
}
