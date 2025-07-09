import type Markdown from 'markdown-it';

export default {
  base: '/',
  assetsDir: '/assets',
  cleanUrls: false,
  ignoreDeadLinks: true,
  title: '文档 | openEuler社区',
  srcExclude: ['**/_menu.md'],
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
    config: (md: Markdown) => {
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
        const content = tokens[idx].content;
        const renderContent = defaultHtmlBlockRender!!(tokens, idx, options, env, self);
        if (content.includes('<img')) {
          return `<MarkdownImage>${renderContent.replace(/(width|height)=['|"](.*?)['|"]/g, '')}</MarkdownImage>`;
        }

        return renderContent;
      };

      const defaultHtmlInlineRender = md.renderer.rules.html_inline;
      md.renderer.rules.html_inline = function (tokens, idx, options, env, self) {
        const content = tokens[idx].content;
        const renderContent = defaultHtmlInlineRender!!(tokens, idx, options, env, self);
        if (content.includes('<img')) {
          return `<MarkdownImage>${renderContent.replace(/(width|height)=['|"](.*?)['|"]/g, '')}</MarkdownImage>`;
        }

        return renderContent;
      };
    },
  },
};
