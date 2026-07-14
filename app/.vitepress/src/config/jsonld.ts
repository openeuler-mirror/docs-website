import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Header, PageData } from 'vitepress';

import { getDomId } from '../utils/common';

export interface JsonLdCtx {
  docsUrl: string;
  mainDomainUrl: string;
  srcDir: string;
}

const ORG_NAME = 'openEuler';
const LICENSE_URL = 'https://license.coscl.org.cn/MulanPSL2';
const ANSWER_MAX = 1000;

const HOWTO_CUES_ZH = [
  '步骤',
  '执行',
  '操作',
  '安装',
  '配置',
  '运行',
  '命令',
  '按以下',
  '如下',
  '部署',
  '设置',
  '创建',
  '启动',
  '校验',
  '下载',
  '修改',
  '查看',
  '删除',
  '添加',
  '编译',
  '升级'
];

const HOWTO_CUES_EN = [
  'step',
  'run',
  'execute',
  'install',
  'configure',
  'deploy',
  'set up',
  'setup',
  'create',
  'start',
  'verify',
  'check',
  'download',
  'modify',
  'update',
  'view',
  'delete',
  'remove',
  'add',
  'compile',
  'upgrade',
  'command',
  'enable',
  'disable',
  'restart',
  'stop',
  'build',
  'generate',
  'follow'
];

const tocLabelCache = new Map<string, string | null>();

function readTocLabel(tocPath: string): string | null {
  const cached = tocLabelCache.get(tocPath);
  if (cached !== undefined) return cached;
  let label: string | null = null;
  if (existsSync(tocPath)) {
    const txt = readFileSync(tocPath, 'utf8');
    const m = txt.match(/^label:\s+(.+)$/m);
    label = m ? m[1].trim() : null;
  }
  tocLabelCache.set(tocPath, label);
  return label;
}

function cleanInline(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstParagraph(body: string): string {
  const lines = body.split(/\r?\n/);
  const para: string[] = [];
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      if (para.length) break;
      continue;
    }
    if (/^>\s/.test(line) || /^!\[/.test(line) || /^</.test(line)) {
      if (para.length) break;
      continue;
    }
    if (line.trim() === '') {
      if (para.length) break;
      continue;
    }
    para.push(line.trim());
  }
  return cleanInline(para.join(' '));
}

function stepName(text: string): string {
  const clipped = text.split(/[，,。:：；;]/)[0];
  return clipped.length > 40 ? `${clipped.slice(0, 40)}…` : clipped;
}

function cleanAnswer(body: string): string {
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  let inCode = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }
    const l = line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^#{1,6}\s+/, '');
    if (l.trim() === '') {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    out.push(l.trim());
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  let text = out.join('\n');
  if (text.length > ANSWER_MAX) text = `${text.slice(0, ANSWER_MAX)}…`;
  return text.trim();
}

function flattenHeaders(headers: Header[], acc: Header[] = []): Header[] {
  for (const h of headers) {
    acc.push(h);
    if (h.children?.length) flattenHeaders(h.children, acc);
  }
  return acc;
}

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function extractHowTo(
  pageData: PageData,
  ctx: JsonLdCtx,
  cues: string[],
  lang: string,
  canonicalUrl: string
): Record<string, unknown> | null {
  const srcPath = resolve(ctx.srcDir, pageData.relativePath);
  if (!existsSync(srcPath)) return null;
  const body = stripFrontmatter(readFileSync(srcPath, 'utf8'));
  const allHeaders = flattenHeaders(pageData.headers);

  const parts = body.split(/^##\s+/m);
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const nl = chunk.indexOf('\n');
    const heading = chunk.slice(0, nl === -1 ? undefined : nl).trim();
    const rest = nl === -1 ? '' : chunk.slice(nl + 1);
    if (!heading) continue;

    const hasCodeBlock = /```/.test(rest);
    const isProcedural = hasCodeBlock || cues.some((c) => rest.includes(c));
    const items: { n: number; text: string }[] = [];
    for (const line of rest.split(/\r?\n/)) {
      const m = line.match(/^(\d+)\.\s+(.+)$/);
      if (m) items.push({ n: parseInt(m[1], 10), text: cleanInline(m[2]) });
    }

    let run: { n: number; text: string }[] = [];
    for (const it of items) {
      if (run.length === 0) {
        if (it.n === 1) run.push(it);
      } else if (it.n === run[run.length - 1].n + 1) {
        run.push(it);
      } else if (it.n === 1) {
        run = [it];
      } else {
        run = [];
      }
    }

    if (isProcedural && run.length >= 3) {
      const computed = `user-content-${getDomId(heading)}`;
      const matched = allHeaders.find(
        (h) => h.slug === computed || cleanInline(h.title) === cleanInline(heading)
      );
      const anchor = matched?.slug ?? computed;
      const sectionUrl = `${canonicalUrl}#${anchor}`;
      const desc = firstParagraph(rest);
      return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: heading,
        ...(desc ? { description: desc } : {}),
        inLanguage: lang,
        isPartOf: { '@type': 'CreativeWork', url: canonicalUrl },
        step: run.map((it, idx) => ({
          '@type': 'HowToStep',
          position: idx + 1,
          name: stepName(it.text),
          text: it.text.slice(0, 300),
          url: sectionUrl
        }))
      };
    }
  }
  return null;
}

function extractFAQ(body: string): { name: string; text: string }[] {
  const parts = body.split(/^##\s+/m);
  const qa: { name: string; text: string }[] = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const nl = chunk.indexOf('\n');
    const heading = chunk.slice(0, nl === -1 ? undefined : nl).trim();
    const rest = nl === -1 ? '' : chunk.slice(nl + 1);
    if (!heading) continue;
    const name = cleanInline(heading);
    if (!name) continue;
    const text = cleanAnswer(rest);
    if (!text) continue;
    qa.push({ name, text });
  }
  return qa;
}

export function buildPageJsonLd(pageData: PageData, ctx: JsonLdCtx): object[] | null {
  if (pageData.isNotFound) return null;
  const rel = pageData.relativePath;
  if (!rel || !rel.endsWith('.md')) return null;
  const parts = rel.split('/');
  if (parts.length < 4 || parts[1] !== 'docs') return null;
  const locale = parts[0];
  if (locale !== 'zh' && locale !== 'en') return null;
  const version = parts[2];
  const chapter = parts[3];
  if (!version || !chapter) return null;

  const lang = locale === 'zh' ? 'zh-CN' : 'en';
  const cues = locale === 'zh' ? HOWTO_CUES_ZH : HOWTO_CUES_EN;

  const docsRoot = resolve(ctx.srcDir, locale, 'docs', version);
  const chapterDir = resolve(docsRoot, chapter);
  const docCenterLabel = readTocLabel(resolve(docsRoot, '_toc.yaml')) || (locale === 'zh' ? '文档中心' : 'Document Center');
  const chapterLabel = readTocLabel(resolve(chapterDir, '_toc.yaml')) || chapter;

  const canonicalUrl = `${ctx.docsUrl}/${rel.replace(/\.md$/, '.html')}`;
  const docCenterUrl = `${ctx.docsUrl}/${locale}/`;
  const hasIndex = existsSync(resolve(chapterDir, 'index.md'));
  const chapterIndexUrl = hasIndex
    ? `${ctx.docsUrl}/${locale}/docs/${version}/${chapter}/index.html`
    : `${ctx.docsUrl}/${locale}/docs/${version}/${chapter}/`;

  const versionLabel = version === 'common' ? '' : `${version} `;
  const isPartOfName =
    locale === 'zh'
      ? `openEuler ${versionLabel}${chapterLabel}文档`
      : `openEuler ${versionLabel}${chapterLabel} Documentation`;
  const aboutText = `openEuler ${versionLabel}${chapterLabel}`;

  const orgId = `${ctx.mainDomainUrl}/#organization`;
  const logoUrl = `${ctx.mainDomainUrl}/img/other/brand/horizontal-left.svg`;

  const title = pageData.title;
  const description = pageData.description;
  const overviewVal = pageData.frontmatter?.overview;
  const isOverview = overviewVal === true || String(overviewVal).toLowerCase() === 'true';
  const relAfterChapter = parts.slice(4).join('/');
  const isChapterRootIndex = relAfterChapter === 'index.md';
  const subChapter = parts[4] ?? '';
  const isFAQPage = version === 'common' && chapter === 'faq' && subChapter !== 'caselibrary';

  const breadcrumbItems: Record<string, unknown>[] = [
    { '@type': 'ListItem', position: 1, name: docCenterLabel, item: docCenterUrl },
    { '@type': 'ListItem', position: 2, name: chapterLabel, item: chapterIndexUrl }
  ];
  if (!isChapterRootIndex) {
    breadcrumbItems.push({ '@type': 'ListItem', position: 3, name: title, item: canonicalUrl });
  }
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems
  };

  const publisherRef = {
    '@type': 'Organization',
    '@id': orgId,
    name: ORG_NAME,
    logo: { '@type': 'ImageObject', url: logoUrl }
  };

  const techArticle = (): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    ...(description ? { description } : {}),
    inLanguage: lang,
    about: aboutText,
    isPartOf: { '@type': 'CreativeWork', name: isPartOfName, url: chapterIndexUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    author: { '@type': 'Organization', name: ORG_NAME },
    publisher: publisherRef,
    license: LICENSE_URL,
    ...(pageData.lastUpdated ? { dateModified: new Date(pageData.lastUpdated).toISOString() } : {})
  });

  let mainEntity: Record<string, unknown>;
  let suppressHowTo = isOverview;

  if (isFAQPage) {
    const srcPath = resolve(ctx.srcDir, pageData.relativePath);
    const qa = existsSync(srcPath)
      ? extractFAQ(stripFrontmatter(readFileSync(srcPath, 'utf8')))
      : [];
    if (qa.length >= 1) {
      mainEntity = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        url: canonicalUrl,
        inLanguage: lang,
        isPartOf: { '@type': 'CreativeWork', name: isPartOfName, url: chapterIndexUrl },
        publisher: publisherRef,
        mainEntity: qa.map((q) => ({
          '@type': 'Question',
          name: q.name,
          acceptedAnswer: { '@type': 'Answer', text: q.text }
        }))
      };
      suppressHowTo = true;
    } else {
      mainEntity = techArticle();
    }
  } else if (isOverview) {
    mainEntity = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': canonicalUrl,
      name: title,
      url: canonicalUrl,
      inLanguage: lang,
      about: aboutText,
      isPartOf: { '@type': 'CreativeWork', name: isPartOfName, url: chapterIndexUrl },
      publisher: publisherRef,
      license: LICENSE_URL
    };
  } else {
    mainEntity = techArticle();
  }

  const schema: object[] = [breadcrumb, mainEntity];
  if (!suppressHowTo) {
    const howTo = extractHowTo(pageData, ctx, cues, lang, canonicalUrl);
    if (howTo) schema.push(howTo);
  }
  return schema;
}
