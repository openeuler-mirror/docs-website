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
import yaml from 'js-yaml';
import url from 'url';
import { TocParser } from '@opendesign-plus/utils';

import { VITEPRESS_VERSIONS_CONFIG } from './config/version.js';
import { getBranchName } from './utils/common.js';

const { posix } = path;

// ============================================ 脚本执行逻辑 ============================================
const BUILD_PATH = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const globalErrors = [];
const tocParser = new TocParser({
  buildPath: BUILD_PATH,
  docsRelativePath: 'app',
  enableParseAnchorNode: true,
  enableParseSceneNode: true,
});

(async () => {
  const versions = process.argv.slice(2);
  if (versions.length === 0) {
    console.error('请提供分支名称');
    process.exit(1);
  }

  const tocZh = [];
  const tocEn = [];
  const outputZhPath = posix.join(BUILD_PATH, './app/.vitepress/public/toc/toc.json');
  const outputEnPath = posix.join(BUILD_PATH, './app/.vitepress/public/toc/toc-en.json');

  for (const item of versions) {
    const version = VITEPRESS_VERSIONS_CONFIG[item] || getBranchName(item);
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

  fs.outputFileSync(outputZhPath, JSON.stringify(tocZh, null, 2));
  fs.outputFileSync(outputEnPath, JSON.stringify(tocEn, null, 2));

  // 打印错误
  tocParser.formatLogErrors([...globalErrors, ...tocParser.getErrors()]);
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
      if (item !== 'tools' && fs.statSync(posix.join(targetPath, item)).isDirectory() && fs.existsSync(posix.join(targetPath, item, '_toc.yaml'))) {
        const content = fs.readFileSync(posix.join(targetPath, item, '_toc.yaml'), 'utf-8');
        const toc = yaml.load(content);
        fs.outputFileSync(posix.join(targetPath, item, 'index.md'), indexMdContent.replace(`title: ''`, `title: ${toc.label}`));
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
    const tocFileZhPath = posix.join(BUILD_PATH, `./app/${lang}/docs/${version}/_toc.yaml`);
    createSceneIndexMd(posix.join(BUILD_PATH, `./app/${lang}/docs/${version}`));
    createSceneIndexMd(posix.join(BUILD_PATH, `./app/${lang}/docs/${version}/tools`));
    const toc = tocParser.parse(tocFileZhPath);
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
    const commonPath = posix.join(BUILD_PATH, `./app/${lang}/docs/common`);
    for (const commonDirname of fs.readdirSync(commonPath)) {
      const toc = tocParser.parse(posix.join(commonPath, commonDirname, '_toc.yaml'));
      result.push(toc);
    }

    return result;
  } catch (err) {
    globalErrors.push(`构建异常：createCommonToc(${lang}) - ${err.message.replace(BUILD_PATH, '.')}`);
  }

  return [];
}
