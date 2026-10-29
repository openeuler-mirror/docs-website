import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type Markdown from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type { HeadConfig } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';

import { getDomId } from './src/utils/common';
import { applySitemapMetadata } from './src/utils/sitemap-metadata';
import { extractFirstParagraph } from './src/utils/md-description';
import { normalizeKeywords } from './src/utils/md-keywords';
import { buildPageJsonLd } from './src/config/jsonld';
import { defineConfig } from 'vitepress';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnvVar(key: string, file = '.env.production'): string | undefined {
  const envFile = resolve(__dirname, '..', file);
  if (!existsSync(envFile)) {
    return undefined;
  }

  const match = readFileSync(envFile, 'utf-8').match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm'));

  return match ? match[1].trim() : undefined;
}

const sitemapHostname = readEnvVar('VITE_SERVICE_DOCS_URL') || 'https://docs.openeuler.org';
const mainDomainUrl = readEnvVar('VITE_MAIN_DOMAIN_URL') || 'https://www.openeuler.org';
const srcDir = resolve(__dirname, '..');

export default defineConfig({
  base: '/',
  assetsDir: '/assets',
  cleanUrls: false,
  ignoreDeadLinks: true,
  metaChunk: true,
  title: '文档 | openEuler社区',
  srcExclude: ['**/_menu.md'],
  sitemap: {
    hostname: sitemapHostname,
    // lastmod 取构建期侧车的提交时间；changefreq / priority 直接取源 md 文件 frontmatter 声明值
    transformItems: (items: any[]) => applySitemapMetadata(items, srcDir),
  },
  head: [
    [
      'link',
      {
        rel: 'icon',
        href: '/favicon.ico?v=2',
      },
    ],
    [
      'meta',
      {
        name: 'viewport',
        content: 'width=device-width,initial-scale=1,user-scalable=no',
      },
    ],
    [
      'script',
      {
        src: '/check-dark-mode-v2.js',
      },
    ],
  ],
  appearance: false, // enable dynamic scripts for dark mode
  titleTemplate: true,
  locales: {
    root: {
      lang: 'zh',
      title: '文档 | openEuler社区',
      description: 'openEuler文档',
    },
    zh: {
      label: '简体中文',
      lang: 'zh',
      title: '文档 | openEuler社区',
      description: 'openEuler文档',
    },
    en: {
      label: 'English',
      lang: 'en',
      title: 'Docs | openEuler',
      description: 'openEuler docs',
    },
  },
  markdown: {
    math: true,
    plantuml: true,
    theme: {
      light: 'light-plus',
      dark: 'dark-plus',
    },
    anchor: {
      slugify: (s: string) => `user-content-${getDomId(s)}`,
    },
    config: (md: Markdown) => {
      // 处理须知/说明/警告/注意
      md.core.ruler.before('normalize', 'replace-old-alerts', (state) => {
        const src = state.src
          .replace(/> *!\[\]\(.*?\/icon-note\.gif\) *\**([^\*\n\r]+)\**/g, (_, $1) => {
            return `> [!NOTE]${$1}`;
          })
          .replace(/> *!\[\]\(.*?\/icon-notice\.gif\) *\**([^\*\n\r]+)\**/g, (_, $1) => {
            return `> [!TIP]${$1}`;
          })
          .replace(/> *!\[\]\(.*?\/icon-warning\.gif\) *\**([^\*\n\r]+)\**/g, (_, $1) => {
            return `> [!WARNING]${$1}`;
          })
          .replace(/> *!\[\]\(.*?\/icon-caution\.gif\) *\**([^\*\n\r]+)\**/g, (_, $1) => {
            return `> [!CAUTION]${$1}`;
          });

        state.src = src;
        if (state.env.content) {
          state.env.content = src;
        }
      });

      // 处理表格内的{}
      md.core.ruler.before('inline', 'td_replace', function (state) {
        let tdOpen = false;
        state.tokens.forEach((token) => {
          if (token.type === 'td_open') {
            tdOpen = true;
            return;
          }

          if (token.type === 'td_close') {
            tdOpen = false;
            return;
          }

          if (
            token.type === 'inline' &&
            tdOpen &&
            !token.content.includes('v-pre') &&
            !token.content.includes('\\{') &&
            !token.content.includes('\\}') &&
            token.content.includes('{') &&
            token.content.includes('}')
          ) {
            token.content = token.content.replace(/\{/g, '\\{');
          }
        });
      });

      // 处理资源图片
      md.core.ruler.after('inline', 'fix-image-paths', (state) => {
        if (!state.tokens) return;

        const processTokens = (tokens: Token[]) => {
          tokens.forEach((token) => {
            // 处理 HTML 块和行内元素中的 img 标签
            if ((token.type === 'html_block' || token.type === 'html_inline') && token.content && token.content.includes('<img')) {
              token.content = token.content.replace(/<img([^>]*)src=['"]?([^'"> ]*)['"]?([^>]*)>/gi, (match, before, src, after) => {
                // 判断是否为本地地址且没有以 / ./ ../ 开头
                if (src && !src.startsWith('http') && !src.startsWith('https') && !src.startsWith('/') && !src.startsWith('./') && !src.startsWith('../')) {
                  return `<img${before}src="./${src}"${after}>`;
                }
                return match;
              });
            }

            // 递归处理子 tokens
            if (token.children && token.children.length > 0) {
              processTokens(token.children);
            }
          });
        };

        processTokens(state.tokens);
      });

      md.renderer.rules.code_inline = (tokens, idx) => {
        const content = tokens[idx].content;
        // 转义
        const escapedContent = md.utils.escapeHtml(content);
        // 处理双花括号
        return `<code v-pre>${escapedContent}</code>`;
      };

      // 替换 {{ }} 内容
      md.renderer.rules.text = (tokens, idx) => {
        const content = tokens[idx].content;
        const escapedContent = md.utils.escapeHtml(content);
        if (/{{(.*?)}}/g.test(content)) {
          return `<span v-pre>${escapedContent}</span>`;
        }
        return escapedContent;
      };

      // 标题处理
      md.renderer.rules.heading_open = function (tokens, idx, options, _, self) {
        const aIndex = tokens[idx].attrIndex('id');
        const id = tokens[idx].attrs?.[aIndex]?.[1];
        const tag = tokens[idx].tag;
        const render = self.renderToken(tokens, idx, options);
        return `${render}${tag === 'h1' || tag === 'h2' ? `<MarkdownTitle title-id="${id || ''}">` : ''}`;
      };

      md.renderer.rules.heading_close = function (tokens, idx, options, _, self) {
        const tag = tokens[idx].tag;
        return `${tag === 'h1' || tag === 'h2' ? '</MarkdownTitle>' : ''}${self.renderToken(tokens, idx, options)}`;
      };

      // 图片
      const imageRender = md.renderer.rules.image;
      md.renderer.rules.image = (...args) => {
        return `<MarkdownImage>${imageRender!!(...args)}</MarkdownImage>`;
      };

      // 处理文档里写的html标签
      const defaultHtmlBlockRender = md.renderer.rules.html_block;
      md.renderer.rules.html_block = (tokens, idx, options, env, self) => {
        tokens[idx].content = tokens[idx].content
          .replace(/\s+(width|height)=['|"](.*?)['|"]/g, '')
          .replace(/<a([^>]*?)href\s*=\s*['"](?!(?:https?:)?\/\/)([^'"]+)\.md(#.*?)?['"]([^>]*?)>/gi, '<a$1href="$2.html$3"$4>')
          .replace(/<video(?![^>]*\bcontrols\b)([^>]*)>/gi, '<video$1 controls>');

        const renderContent = defaultHtmlBlockRender!!(tokens, idx, options, env, self);
        if (renderContent.includes('<img')) {
          return renderContent.replace(/(<img\s[^>]*>\s*<\/img>|<img\s[^>]*\/?>)/gi, '<MarkdownImage>$1</MarkdownImage>');
        }

        return renderContent;
      };

      const defaultHtmlInlineRender = md.renderer.rules.html_inline;
      md.renderer.rules.html_inline = function (tokens, idx, options, env, self) {
        tokens[idx].content = tokens[idx].content
          .replace(/\s+(width|height)=['|"](.*?)['|"]/g, '')
          .replace(/<a([^>]*?)href\s*=\s*['"](?!(?:https?:)?\/\/)([^'"]+)\.md(#.*?)?['"]([^>]*?)>/gi, '<a$1href="$2.html$3"$4>')
          .replace(/<video(?![^>]*\bcontrols\b)([^>]*)>/gi, '<video$1 controls>');

        const renderContent = defaultHtmlInlineRender!!(tokens, idx, options, env, self);
        if (renderContent.includes('<img')) {
          return `<MarkdownImage>${renderContent}</MarkdownImage>`;
        }

        return renderContent;
      };
    },
  },
  transformPageData(pageData) {
    const fmDescription = pageData.frontmatter?.description;

    // frontmatter 已声明非空 description 时直接沿用（VitePress 会自动写入页面），不存在才截取正文第一段
    if (
      !(typeof fmDescription === 'string' && fmDescription.trim() !== '') &&
      pageData.relativePath?.endsWith('.md')
    ) {
      try {
        const srcPath = resolve(srcDir, pageData.relativePath);

        // 源文件存在才读取，否则保留站点默认 description
        if (existsSync(srcPath)) {
          const description = extractFirstParagraph(readFileSync(srcPath, 'utf-8'));

          // 提取到有效段落才覆盖默认描述
          if (description) {
            pageData.description = description;
          }
        }
      } catch {
        // 读取失败时保留站点默认 description
      }
    }

    // frontmatter 声明了 keywords 时输出 <meta name="keywords"> 到 head，frontmatter.head 已手工声明同标签时不重复注入
    const keywords = normalizeKeywords(pageData.frontmatter?.keywords);
    const hasKeywordsMeta = (pageData.frontmatter?.head ?? []).some((entry: HeadConfig) => entry[0] === 'meta' && entry[1]?.name === 'keywords');
    if (keywords && !hasKeywordsMeta) {
      (pageData.frontmatter.head ??= []).push(['meta', { name: 'keywords', content: keywords }]);
    }

    const schema = buildPageJsonLd(pageData, { docsUrl: sitemapHostname, mainDomainUrl, srcDir });
    if (schema) {
      (pageData.frontmatter.head ??= []).push(['script', { type: 'application/ld+json' }, JSON.stringify(schema)]);
    }
  },
  vite: {
    plugins: [
      llmstxt({
        ignoreFiles: ['!**/25.09/**'],
      }),
    ],
    ssr: {
      noExternal: ['@opendesign-plus/components', 'element-plus'],
    },
  },
});
