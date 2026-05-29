import { dirname, join, resolve } from 'node:path';
import { createWriteStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import type Markdown from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import llmstxt from 'vitepress-plugin-llms';

import { getDomId } from './src/utils/common';
import { defineConfig } from 'vitepress';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnvVar(key: string): string | undefined {
  const envFile = resolve(process.cwd(), '.env.production');
  if (!existsSync(envFile)) {
    return undefined;
  }

  const match = readFileSync(envFile, 'utf-8').match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm'));

  return match ? match[1].trim() : undefined;
}

const sitemapHostname = readEnvVar('VITE_SERVICE_DOCS_URL') || 'https://docs.openeuler.org';

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
    transformItems: (items: any[]) => {
      items.forEach((item) => {
        item.lastmod = new Date().toISOString();
      });

      return items;
    },
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
          .replace(/<a([^>]*?)href\s*=\s*['"](?!(?:https?:)?\/\/)([^'"]+)\.md(#.*?)?['"]([^>]*?)>/gi, '<a$1href="$2.html$3"$4>');

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
          .replace(/<a([^>]*?)href\s*=\s*['"](?!(?:https?:)?\/\/)([^'"]+)\.md(#.*?)?['"]([^>]*?)>/gi, '<a$1href="$2.html$3"$4>');

        const renderContent = defaultHtmlInlineRender!!(tokens, idx, options, env, self);
        if (renderContent.includes('<img')) {
          return `<MarkdownImage>${renderContent}</MarkdownImage>`;
        }

        return renderContent;
      };
    },
  },
  async buildEnd() {
    const packageConfig = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    if (!packageConfig.scripts.build.includes('common')) {
      return;
    }

    let logs = execSync('git ls-remote --heads https://gitcode.com/openeuler/docs.git', { encoding: 'utf-8' });
    logs += execSync('git ls-remote --heads https://gitcode.com/openeuler/docs-centralized.git', { encoding: 'utf-8' });
    let branches = logs
      .split('\n')
      .map((line) => line.slice(line.indexOf('refs/heads/') + 11))
      .filter((line) => line.startsWith('stable') && !line.includes('common'))
      .map((br) => br.split('-')[1]);
    branches = [...new Set(branches)];

    // ============ write sitemap.xml
    const sitemapIndex = join(__dirname, 'dist', 'sitemap_index.xml');
    writeFileSync(
      sitemapIndex,
      `<?xml version="1.0" encoding="utf-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${branches
  .filter((br) => !br.includes('common'))
  .map((br) => {
    return `  <sitemap>
  <loc>${sitemapHostname}/docs/${br}/sitemap.xml</loc>
</sitemap>`;
  })
  .join('\n')}
</sitemapindex>`
    );

    // 写robots.txt
    const robots = join(__dirname, 'dist/robots.txt');
    if (!existsSync(robots)) {
      console.log(`❌ robots.txt不存在`);
    } else {
      const robotsContent = readFileSync(robots, 'utf-8');
      writeFileSync(robots, `${robotsContent}\nSitemap:${sitemapHostname}/sitemap_index.xml`);
    }

    // ============ write llms.txt
    const llmstxtPath = join(__dirname, 'dist', 'llms.txt');
    if (!existsSync(llmstxtPath)) {
      console.log(`❌ llms.txt不存在`);
      return;
    }
    const llmsWriteStream = createWriteStream(llmstxtPath, { flags: 'a' });
    for (const br of branches) {
      try {
        const resp = await fetch(`https://docs.openeuler.org/docs/${br}/llms.txt`);
        if (!resp.ok || !resp.body) {
          console.log(`❌ ${br} llms.txt无法访问！！`);
          continue;
        }
        console.log(`开始拼接 ${br} llms.txt`);
        llmsWriteStream.write('\n');

        let isFirstChunk = true;
        for await (let chunk of resp.body.pipeThrough(new TextDecoderStream())) {
          if (isFirstChunk) {
            isFirstChunk = false;
            const index = chunk.indexOf('## Table of Contents');
            if (index >= 0) {
              chunk = chunk.slice(index).replace('Table of Contents', `${br} documents`);
            }
          }
          const ok = llmsWriteStream.write(chunk);
          if (!ok) {
            await new Promise<void>((resolve) => llmsWriteStream.once('drain', () => resolve()));
          }
        }
        console.log(`✅ ${br} llms.txt 拼接完成`);
      } catch {
        console.log(`❌ ${br} llms.txt 拼接失败`);
      }
    }
    llmsWriteStream.end(() => console.log('llms.txt拼接完成'));

    // ============ write llms-full.txt
    const llmsfulltxtPath = join(__dirname, 'dist', 'llms-full.txt');
    if (!existsSync(llmsfulltxtPath)) {
      console.log(`❌ llms-full.txt不存在`);
      return;
    }
    const llmsFullWriteStream = createWriteStream(llmsfulltxtPath, { flags: 'a' });
    for (const br of branches) {
      try {
        const resp = await fetch(`https://docs.openeuler.org/docs/${br}/llms-full.txt`);
        if (!resp.ok || !resp.body) {
          console.log(`❌ ${br} llms-full.txt无法访问！！`);
          continue;
        }
        console.log(`开始拼接 ${br} llms-full.txt`);
        llmsFullWriteStream.write('\n');

        for await (const chunk of resp.body) {
          const ok = llmsFullWriteStream.write(chunk);
          if (!ok) {
            await new Promise<void>((resolve) => llmsFullWriteStream.once('drain', () => resolve()));
          }
        }
        console.log(`✅ ${br} llms-full.txt 拼接完成`);
      } catch {
        console.log(`❌ ${br} llms-full.txt 拼接失败`);
      }
    }
    llmsFullWriteStream.end(() => console.log('llms-full.txt拼接完成'));
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
