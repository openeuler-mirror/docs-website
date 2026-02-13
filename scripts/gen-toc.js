/**
 * 文档目录结构生成脚本
 * ====================================================================================================
 *
 * 功能概述：
 * - 解析 _toc.yaml 生成文档站点的目录结构，并输出为 toc.json
 * - 支持远程 SIG 文档中 _toc.yaml 的整合
 *
 * 使用方式：
 *   在项目根目录下执行：
 *   node scripts/gen-toc.js <branch1> [branch2] [branch3]...
 *
 * 参数说明：
 *   branch - 文档版本分支名
 *
 * 示例：
 *   node scripts/gen-toc.js stable-common
 *   node scripts/gen-toc.js stable-common stable-25.09
 *
 * 输出文件：
 *   - app/.vitepress/public/toc/toc.json    (中文)
 *   - app/.vitepress/public/toc/toc-en.json (英文)
 * ====================================================================================================
 */

import fs from 'fs-extra';
import path from 'path';
import url from 'url';
import matter from 'gray-matter';
import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import yaml from 'js-yaml';

import { VITEPRESS_VERSION_CONFIG } from './config/version.js';
import { getBranchName } from './utils/common.js';
import { getGitUrlInfo } from './utils/git.js';
import { getMdTitleId, getMdFilterContent } from './utils/markdown.js';

// ============================================ 脚本执行逻辑 ============================================
const BUILD_PATH = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

const globalErrors = [];
const globalIds = new Set();
const globalHandledSceneMdPath = new Set();
const globalHandledYaml = new Map();

(async () => {
  const versions = process.argv.slice(2);
  if (versions.length === 0) {
    console.error('请提供分支名称');
    process.exit(1);
  }

  const tocZh = [];
  const tocEn = [];
  const outputZhPath = path.join(BUILD_PATH, './app/.vitepress/public/toc/toc.json');
  const outputEnPath = path.join(BUILD_PATH, './app/.vitepress/public/toc/toc-en.json');

  for (const item of versions) {
    const version = VITEPRESS_VERSION_CONFIG[item] || getBranchName(item);
    console.log(`正在构建 ${version} toc 文件...`);
    if (version === 'common') {
      // common 分支处理
      const commonTocZh = createCommonToc('zh');
      tocZh.push(...commonTocZh);
      const commonTocEn = createCommonToc('en');
      tocEn.push(...commonTocEn);
    } else {
      // 版本分支
      const versionTocZh = createVersionToc(version, 'zh');
      tocZh.push(...versionTocZh);
      const versionTocEn = createVersionToc(version, 'en');
      tocEn.push(...versionTocEn);
    }
  }

  // 打印错误
  if (globalErrors.length > 0) {
    console.log('[Exceptions - 异常]：');
    globalErrors.forEach((item) => {
      console.log('-------------------------------------------------------');
      if (typeof item === 'string') {
        console.log(item);
        return;
      }
      
      console.log(`[调用函数]：${item.functionName}`);
      console.log(`[错误信息]：${item.message}`);
      console.log(`[本地资源]：${item.filePath.replace(BUILD_PATH, '').replaceAll('\\', '/')}`);
      if (item.upstream) {
        console.log(`[远程地址]：${item.upstream}`);
      }

      if (item.toc && (item.toc.label || item.toc.href)) {
        console.log(`[toc]：${item.toc.label ? `label: ${item.toc.label}` : ''} ${item.toc.href ? `href: ${item.toc.href}` : ''}`);
      }

      if (item.err) {
        console.log('[原始错误]：');
        console.log(item.err);
      }
    });
  }

  fs.outputFileSync(outputZhPath, JSON.stringify(tocZh, null, 2));
  fs.outputFileSync(outputEnPath, JSON.stringify(tocEn, null, 2));
  console.log(`构建 toc 结束`);
})();

// ============================================ 处理版本 toc 相关函数 ============================================
/**
 * 创建文档场景页面的index.md
 */
function createSceneIndexMd(targetPath) {
  const indexMdContent = `---
title: ''
overview: true
---`;

  try {
    fs.readdirSync(targetPath).forEach((item) => {
      if (item !== 'tools' && fs.statSync(path.join(targetPath, item)).isDirectory() && fs.existsSync(path.join(targetPath, item, '_toc.yaml'))) {
        const content = fs.readFileSync(path.join(targetPath, item, '_toc.yaml'), 'utf-8');
        const toc = yaml.load(content);
        fs.outputFileSync(path.join(targetPath, item, 'index.md'), indexMdContent.replace(`title: ''`, `title: ${toc.label}`));
      }
    });
  } catch (err) {
    globalErrors.push(`构建异常：createSceneIndexMd(${targetPath.replace(BUILD_PATH, '.')}) - ${err.message.replace(BUILD_PATH, '.')}`);
  }
}

/**
 * 创建版本分支的 toc
 * @param {string} version 版本
 * @param {zh|en} lang 语言
 */
function createVersionToc(version, lang = 'zh') {
  try {
    const tocFileZhPath = path.join(BUILD_PATH, `./app/${lang}/docs/${version}/_toc.yaml`);
    createSceneIndexMd(path.join(BUILD_PATH, `./app/${lang}/docs/${version}`));
    createSceneIndexMd(path.join(BUILD_PATH, `./app/${lang}/docs/${version}/tools`));
    const toc = parseTocYaml(tocFileZhPath);
    return toc?.sections || [];
  } catch (err) {
    globalErrors.push(`构建异常：createVersionToc(${version}, ${lang}) - ${err.message.replace(BUILD_PATH, '.')}`);
  }

  return [];
}

/**
 * 创建 commom 分支的 toc
 * @param {zh|en} lang 语言
 */
function createCommonToc(lang = 'zh') {
  try {
    const result = [];
    const commonPath = path.join(BUILD_PATH, `./app/${lang}/docs/common`);
    for (const commonDirname of fs.readdirSync(commonPath)) {
      const toc = parseTocYaml(path.join(commonPath, commonDirname, '_toc.yaml'));
      result.push(toc);
    }

    return result;
  } catch (err) {
    globalErrors.push(`构建异常：createCommonToc(${lang}) - ${err.message.replace(BUILD_PATH, '.')}`);
  }

  return [];
}

// ============================================ 合并 toc 相关函数 ============================================
/**
 * 获取文档链接
 * @param {string} href 链接
 * @param {string} label 名称
 */
function getDocsUrl(href, label) {
  const tempHref = href.replace(path.resolve(BUILD_PATH, 'app'), '').replace(/\\/g, '/').replace('.md', '.html');
  if (!globalIds.has(tempHref)) {
    return tempHref;
  }

  if (!globalIds.has(`${tempHref}?label=${label}`)) {
    return `${tempHref}?label=${label}`;
  }

  let i = 1;
  while (globalIds.has(`${tempHref}?label=${label}-${i}`)) {
    i++;
  }

  return `${tempHref}?label=${label}-${i}`;
}

/**
 * 获取 id
 * @param {object} toc toc 对象
 */
function getId(toc) {
  if (toc.href && !globalIds.has(toc.href)) {
    globalIds.add(toc.href);
    return toc.href;
  }

  if (toc.path && !globalIds.has(toc.path)) {
    globalIds.add(toc.path);
    return toc.path;
  }

  if (toc.label) {
    if (!globalIds.has(toc.label)) {
      globalIds.add(toc.label);
      return toc.label;
    } else {
      let i = 1;
      while (globalIds.has(`${toc.label}-${i}`)) {
        i++;
      }
      return `${toc.label}-${i}`;
    }
  }

  return String(Math.random());
}

/**
 * 通过 _toc.yaml 构建 toc
 * @param {string} tocFilePath toc文件路径
 * @param {string} upstream 远程地址
 */
function parseTocYaml(tocFilePath, upstream) {
  // 已处理过直接返回
  if (globalHandledYaml.get(tocFilePath)) {
    return globalHandledYaml.get(tocFilePath);
  }

  try {
    // 检查文件是否存在
    if (!fs.existsSync(tocFilePath)) {
      throw new Error('文件不存在');
    }

    const toc = yaml.load(fs.readFileSync(tocFilePath, 'utf-8'));
    globalHandledYaml.set(tocFilePath, toc);
    return parseToc(toc, tocFilePath, upstream);
  } catch (err) {
    globalErrors.push({
      functionName: 'parseTocYaml',
      message: err.message,
      upstream,
      filePath: tocFilePath,
      err,
    });
  }

  return null;
}

/**
 * 获取转换过后的 toc
 * @param {object} toc toc对象
 * @param {string} tocFilePath toc文件路径
 * @param {string} upstream 远程地址
 */
function parseToc(toc, tocFilePath, upstream) {
  if (toc.id) {
    return toc;
  }

  try {
    toc = parseHref(toc, tocFilePath, upstream);
    if (toc && !toc.id) {
      toc = parseId(toc);
      toc = parseLabel(toc, tocFilePath, upstream);
      toc = parseSections(toc, tocFilePath, upstream);
    }

    return toc;
  } catch (err) {
    globalErrors.push({
      functionName: 'parseToc',
      message: err.message,
      toc,
      upstream,
      filePath: tocFilePath,
      err,
    });
  }

  return null;
}

/**
 * 处理 id
 * @param {object} toc toc对象
 */
function parseId(toc) {
  if (!toc.id) {
    toc.id = getId(toc);
  }

  return toc;
}

/**
 * 处理 label
 * @param {object} toc toc对象
 * @param {string} tocFilePath toc文件路径
 * @param {string} upstream 远程地址
 */
function parseLabel(toc, tocFilePath, upstream) {
  if (!toc.label) {
    globalErrors.push({
      functionName: 'parseLabel',
      message: 'label 字段为空',
      toc,
      upstream,
      filePath: tocFilePath,
    });
  }

  return toc;
}

/**
 * 处理 href
 * @param {object} toc toc对象
 * @param {string} tocFilePath toc文件路径
 * @param {string} upstream 远程地址
 */
function parseHref(toc, tocFilePath, upstream) {
  const currentDir = path.dirname(tocFilePath);

  // 情况1：href 为字符串
  if (typeof toc.href === 'string') {
    // _toc.yaml 继续转换
    if (toc.href.endsWith('_toc.yaml')) {
      return parseTocYaml(path.join(currentDir, toc.href), upstream);
    }

    // md 文件
    if (!toc.href.startsWith('http') && toc.href.endsWith('.md')) {
      // 如果存在 upstream，代表该 toc 的祖/父节点是远程 toc 节点，需要还原出 git 地址
      if (upstream) {
        toc.upstream = url.resolve(upstream, toc.href).replace(/\\/g, '/');
      }

      const mdPath = path.resolve(currentDir, toc.href);
      toc.href = getDocsUrl(mdPath, toc.label || '');
      toc.type = 'page';
      if (!Array.isArray(toc.sections)) {
        return parseAnchorSections(toc, mdPath, upstream);
      }
    }

    // toc 有 sections 或 href 可能为一个外链
    return toc;
  }

  // 情况2：href 为 upstream 对象
  if (typeof toc.href === 'object' && typeof toc.href.upstream === 'string') {
    const { repo, locations } = getGitUrlInfo(toc.href.upstream);
    const yamlUpstream = toc.href.upstream.replace('_toc.yaml', '');
    const yamlPath = toc.href.path ? path.join(currentDir, toc.href.path, '_toc.yaml') : path.join(currentDir, repo, ...locations.slice(2));
    return parseTocYaml(yamlPath, yamlUpstream);
  }

  // 情况3：场景节点
  const sceneMdPath = path.join(currentDir, 'index.md');
  if (!globalHandledSceneMdPath.has(sceneMdPath) && fs.existsSync(sceneMdPath)) {
    const indexContent = fs.readFileSync(sceneMdPath, 'utf-8');
    const { data } = matter(indexContent);
    if (data.overview) {
      globalHandledSceneMdPath.add(sceneMdPath);
      toc.href = getDocsUrl(sceneMdPath, toc.label || '');
      toc.type = 'page';
      return toc;
    }
  }

  // 情况4：没有 href
  toc.href = getDocsUrl(currentDir, toc.label || '');
  toc.type = 'menu';
  return toc;
}

/**
 * 处理 sections
 * @param {object} toc toc对象
 * @param {string} tocFilePath toc文件路径
 * @param {string} upstream 远程地址
 */
function parseSections(toc, tocFilePath, upstream) {
  if (Array.isArray(toc.sections)) {
    const handledSections = [];
    toc.sections.forEach((item) => {
      let section = parseToc(item, tocFilePath, upstream);
      if (section) {
        handledSections.push(section);
      }
    });

    toc.sections = handledSections;
  }

  return toc;
}

/**
 * 处理添加 md 锚点 sections
 * @param {object} toc toc对象
 * @param {string} mdPath md文件路径
 * @param {string} upstream 远程地址
 */
function parseAnchorSections(toc, mdPath, upstream) {
  if (!fs.existsSync(mdPath)) {
    globalErrors.push({
      functionName: 'parseAnchorSections',
      message: '文件不存在',
      toc,
      upstream,
      filePath: mdPath,
    });
    return toc;
  }

  try {
    const content = fs.readFileSync(mdPath, 'utf-8');

    const sections = [];
    const md = markdownIt().use(markdownItAnchor, {
      permalink: false,
      level: [2],
      slugify: (str) => getMdTitleId(str),
      callback: (_, info) => {
        if (info && info.title && info.slug) {
          const href = `${toc.href}#${info.slug}`;
          sections.push({
            type: 'anchor',
            label: getMdFilterContent(info.title),
            id: href,
            href,
          });
        }
      },
    });

    md.parse(content, {});
    if (sections.length) {
      toc.sections = sections;
    }
  } catch (err) {
    globalErrors.push({
      functionName: 'parseAnchorSections',
      message: err?.message,
      toc,
      upstream,
      filePath: mdPath,
      err,
    });
  }

  return toc;
}
