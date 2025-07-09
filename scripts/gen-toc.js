import fs from 'fs-extra';
import path from 'path';
import url from 'url';

import matter from 'gray-matter';
import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import yaml from 'js-yaml';
import { slugify } from '@mdit-vue/shared';

import { getGitUrlInfo } from './utils/git.js';

const __dirname = path.resolve(); // 获取当前文件夹路径
const recordIds = new Set(); // 已处理过的 id
const errors = [];

/**
 * git clone
 * @param {object} item item
 */
function parseUpstream(item) {
  let result = false;

  try {
    // 解析url获取仓库信息
    const { repo, locations } = getGitUrlInfo(item.href.upstream);
    item.upstream = item.href.upstream.replace('_toc.yaml', '');
    if (item.href.path) {
      item.path = item.href.path;
      item.href = path.join(item.href.path, '_toc.yaml');
    } else {
      item.href = path.join(repo, ...(locations.slice(2)));
    }
    
    result = true;
  } catch (err) {
    errors.push({
      type: 'Build Exception (构建异常)',
      file: item.href.upstream,
      message: `parseUpstream - ${err.message.replace(__dirname, '.').replace(/\\/g, '/')}`,
    });
  }

  return result;
}

/**
 * 去除一些 md 符号，只保留文本
 * @param {string} href 链接
 */
function getMarkdownOrignalContent(str) {
  return str
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 去除加粗（**）
    .replace(/\*([^*]+)\*/g, '$1') // 去除斜体（*）
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 去除链接
    .replace(/<[^>]+>/g, '') // 去除 HTML 标签
    .replace(/`/g, ''); // 去除反引号
}

/**
 * 转换 href 链接
 * @param {string} href 链接
 * @param {string} label 名称
 */
function parseHref(href, label) {
  const tempHref = href.replace(path.resolve(__dirname, 'app'), '').replace(/\\/g, '/').replace('.md', '.html');
  if (!recordIds.has(tempHref)) {
    return tempHref;
  }

  if (!recordIds.has(`${tempHref}?label=${label}`)) {
    return `${tempHref}?label=${label}`;
  }

  let i = 1;
  while (recordIds.has(`${tempHref}?label=${label}${i}`)) {
    i++;
  }

  return `${tempHref}?label=${label}${i}`;
}

/**
 * 获取以 title 为 label 的节点
 * @param {number} level 标题等级
 */
function getTitleNodes(filePath, parentHref) {
  // 检测文件是否存在
  if (!fs.existsSync(filePath)) {
    errors.push({
      type: 'File Non-Existent (文件不存在)',
      file: filePath.replace(__dirname, '.').replace(/\\/g, '/'),
    });
    return null;
  }

  // 获取 md 内容
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { content: markdownContent } = matter(content);

    // 解析获取 md 指定等级的标题
    const md = markdownIt().use(markdownItAnchor, {
      permalink: false,
      level: [2],
      slugify: (str) => slugify(getMarkdownOrignalContent(str)),
    });

    const tokens = md.parse(markdownContent, {});
    const headings = [];
    tokens.forEach((token, index) => {
      if (token.type === 'heading_open' && token.tag === 'h2') {
        const id = token.attrs.find(([key]) => key === 'id')[1];
        const mdPath = parseHref(`${parentHref}#${id}`, '');
        headings.push({
          type: 'anchor',
          label: getMarkdownOrignalContent(tokens[index + 1].content),
          id: mdPath,
          href: mdPath,
        });
      }
    });

    return headings;
  } catch (err) {
    errors.push({
      type: 'Resolve Markdown File Exception (解析 Markdown 文件异常)',
      file: filePath.replace(__dirname, '.').replace(/\\/g, '/'),
      message: err.message.replace(__dirname, '.').replace(/\\/g, '/'),
    });
  }

  return null;
}

/**
 * 获取 id
 * @param {object} item 菜单项
 */
function getId(item) {
  if (item.href && !recordIds.has(item.href)) {
    recordIds.add(item.href);
    return item.href;
  }

  if (item.path && !recordIds.has(item.path)) {
    recordIds.add(item.path);
    return item.path;
  }

  if (item.label) {
    if (!recordIds.has(item.label)) {
      recordIds.add(item.label);
      return item.label;
    } else {
      let i = 1;
      while (recordIds.has(`${item.label}${i}`)) {
        i++;
      }
      return `${item.label}${i}`;
    }
  }

  return String(Math.random());
}

/**
 * 转换子节点
 * @param {string} dirname 父目录
 * @param {array} sections 子节点
 * @param {string} upstream 远程地址
 */
async function parseNodeSections(dirname, sections, upstream) {
  const parsedSections = [];

  for (const child of sections) {
    // 存在 sections，递归处理
    if (child.sections) {
      child.sections = await parseNodeSections(dirname, child.sections, upstream);
    }

    if (typeof child?.href?.upstream === 'string' && !parseUpstream(child)) {
      continue;
    }

    // 处理 href
    if (child.href) {
      child.type = 'page';
      if (!child.href.startsWith('http')) {
        const filePath = path.resolve(dirname, child.href);

        // 检测文件是否存在
        if (!fs.existsSync(filePath)) {
          errors.push({
            type: 'File Non-Existent (文件不存在)',
            file: filePath.replace(__dirname, '.').replace(/\\/g, '/'),
          });
          continue;
        }

        // toc.yaml 继续递归处理
        if (child.href.endsWith('_toc.yaml')) {
          const tocPath = path.resolve(dirname, child.href);
          const parsedChild = await mergeSections(tocPath, child.upstream || upstream);
          if (parsedChild) {
            parsedSections.push(parsedChild);
          }
          continue;
        }

        // 处理upstream
        if ((child.upstream || upstream) && child.href) {
          child.upstream = url.resolve(child.upstream || upstream, child.href).replace(/\\/g, '/');
        }

        child.href = parseHref(filePath, child.label || '');
        if (!child.sections) {
          const nodes = getTitleNodes(filePath, child.href);
          if (nodes?.length > 0) {
            child.sections = nodes;
          }
        }
      }
    } else {
      child.type = 'menu';
    }

    // 设置 id
    child.id = getId(child);

    parsedSections.push(child);
  }

  return parsedSections;
}

/**
 * 合并文件内容的递归函数（同步）
 * @param {string} filePath 文件路径
 * @param {string} upstream 远程地址
 */
async function mergeSections(filePath, upstream) {
  // 检测文件是否存在
  if (!fs.existsSync(filePath)) {
    errors.push({
      type: 'File Non-Existent (文件不存在)',
      file: filePath.replace(__dirname, '.').replace(/\\/g, '/'),
    });
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const toc = yaml.load(content);

    // label为空提示
    if (!toc.label) {
      errors.push({
        type: 'Label Field Empty (label 字段为空)',
        file: filePath.replace(__dirname, '.').replace(/\\/g, '/'),
      });
    }

    const currenDirName = path.dirname(filePath);

    // 处理upstream
    if (upstream && toc.href && !toc.href.startsWith('http')) {
      toc.upstream = url.resolve(upstream, toc.href).replace(/\\/g, '/');
    }

    // 处理当前文件的 href 字段
    if (toc.href) {
      if (!toc.href.startsWith('http')) {
        toc.href = parseHref(path.resolve(currenDirName, toc.href), toc.label || '');
      }
      toc.type = 'page';
    } else if (fs.existsSync(path.join(currenDirName, 'index.md'))) {
      const indexContent = fs.readFileSync(path.join(currenDirName, 'index.md'), 'utf-8');
      const { data } = matter(indexContent);
      if (data.overview) {
        toc.href = parseHref(path.join(currenDirName, 'index.md'), toc.label || '');
        toc.type = 'page';
      }
    } else {
      toc.href = parseHref(currenDirName, toc.label || '');
      toc.type = 'path';
    }

    // 设置 id
    toc.id = getId(toc);

    // 处理 sections
    if (toc.sections) {
      toc.sections = await parseNodeSections(currenDirName, toc.sections, upstream);
    }

    return toc;
  } catch (err) {
    errors.push({
      type: 'Build Exception (构建异常)',
      file: filePath.replace(__dirname, '.').replace(/\\/g, '/'),
      message: `mergeSections - ${err.message.replace(__dirname, '.').replace(/\\/g, '/')}`,
    });
  }

  return null;
}

/**
 * 创建文档模块的index.md
 */
function createOverviewIndexMd(targetPath) {
  const indexMdContent = `---
title
overview: true
---`;

  try {
    fs.readdirSync(targetPath).forEach((item) => {
      if (item !== 'Tools' && fs.statSync(path.join(targetPath, item)).isDirectory() && fs.existsSync(path.join(targetPath, item, '_toc.yaml'))) {
        const content = fs.readFileSync(path.join(targetPath, item, '_toc.yaml'), 'utf-8');
        const toc = yaml.load(content);
        fs.outputFileSync(path.join(targetPath, item, 'index.md'), indexMdContent.replace('title', `title: ${toc.label}`));
      }
    });
  } catch (err) {
    errors.push({
      type: 'Build Exception (构建异常)',
      file: targetPath.replace(__dirname, '.').replace(/\\/g, '/'),
      message: `createOverviewIndexMd - ${err.message.replace(__dirname, '.').replace(/\\/g, '/')}`,
    });
  }
}

/**
 * 创建版本分支的 toc
 * @param {string} version 版本
 * @param {zh|en} lang 语言
 */
async function createVersionToc(version, lang = 'zh') {
  try {
    const tocFileZhPath = path.join(__dirname, `./app/${lang}/docs/${version}/_toc.yaml`);
    createOverviewIndexMd(path.join(__dirname, `./app/${lang}/docs/${version}`));
    createOverviewIndexMd(path.join(__dirname, `./app/${lang}/docs/${version}/tools`));
    const toc = await mergeSections(tocFileZhPath);
    return toc?.sections || [];
  } catch (err) {
    errors.push({
      type: 'Build Exception (构建异常)',
      message: `createVersionToc(${version}, ${lang}) - ${err.message.replace(__dirname, '.').replace(/\\/g, '/')}`,
    });
  }

  return [];
}

/**
 * 创建 commom 分支的 toc
 * @param {zh|en} lang 语言
 */
async function createCommonToc(lang = 'zh') {
  try {
    const result = [];
    const commonPath = path.join(__dirname, `./app/${lang}/docs/common`);
    for (const commonDirname of fs.readdirSync(commonPath)) {
      const toc = await mergeSections(path.join(commonPath, commonDirname, '_toc.yaml'));
      result.push(toc);
    }

    return result;
  } catch (err) {
    errors.push({
      type: 'Build Exception (构建异常)',
      message: `createCommonToc(${lang}) - ${err.message.replace(__dirname, '.').replace(/\\/g, '/')}`,
    });
  }

  return [];
}

/**
 * 处理文件
 */
async function processTocFile() {
  const versions = process.argv.slice(2);
  if (versions.length === 0) {
    console.error('请提供分支名称');
    process.exit(1);
  }

  const tocZh = [];
  const tocEn = [];
  const outputZhPath = path.join(__dirname, './app/.vitepress/public/toc/toc.json');
  const outputEnPath = path.join(__dirname, './app/.vitepress/public/toc/toc-en.json');

  for (const version of versions) {
    console.log(`正在构建 ${version} toc 文件...`);
    if (version === 'common') {
      // common 分支处理
      const commonTocZh = await createCommonToc('zh');
      tocZh.push(...commonTocZh);
      const commonTocEn = await createCommonToc('en');
      tocEn.push(...commonTocEn);
    } else {
      // 版本分支
      const versionTocZh = await createVersionToc(version, 'zh');
      tocZh.push(...versionTocZh);
      const versionTocEn = await createVersionToc(version, 'en');
      tocEn.push(...versionTocEn);
    }
  }

  // 打印错误
  if (errors.length > 0) {
    console.log('[Exceptions - 异常]: ');
    errors.forEach((err) => {
      const el = [];
      if (err.file) {
        el.push(err.file);
      }

      if (err.message) {
        el.push(err.message);
      }

      console.log(`${err.type}: ${el.join(' | ')}`);
    });
  }

  fs.outputFileSync(outputZhPath, JSON.stringify(tocZh, null, 2));
  fs.outputFileSync(outputEnPath, JSON.stringify(tocEn, null, 2));
  console.log(`构建 toc 结束`);
}

// 执行处理
processTocFile();
