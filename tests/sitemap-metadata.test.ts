/**
 * @vitest-environment node
 */
import fs from 'fs';
import os from 'node:os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const isoTime = '2026-01-02T03:04:05.000Z';

describe('sitemap-metadata', () => {
  let tmpDir = '';
  let srcDir = '';
  let sidecarPath = '';

  function writeDocsMd(relativePath: string, content: string): void {
    const filePath = path.join(srcDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-metadata-'));
    srcDir = path.join(tmpDir, 'src');
    sidecarPath = path.join(tmpDir, 'docs-lastmod.json');
    process.env.DOCS_LASTMOD_FILE = sidecarPath;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.DOCS_LASTMOD_FILE;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  async function loadModule() {
    vi.resetModules();
    return import('../app/.vitepress/src/utils/sitemap-metadata');
  }

  describe('lastmod sidecar', () => {
    it('sidecar 缺失时回退为构建时间', async () => {
      const { applySitemapMetadata } = await loadModule();
      const [item] = applySitemapMetadata([{ url: 'https://docs.openeuler.org/zh/docs/25.09/missing.html' }], srcDir);

      expect(item.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('按 locale 和版本目录名读取 sidecar，并支持中文路径解码', async () => {
      fs.writeFileSync(
        sidecarPath,
        JSON.stringify({
          '25.09::zh/中文/安装.md': isoTime,
        }),
        'utf-8',
      );

      const { applySitemapMetadata } = await loadModule();
      const [absoluteItem, relativeItem] = applySitemapMetadata(
        [
          { url: 'https://docs.openeuler.org/zh/docs/25.09/%E4%B8%AD%E6%96%87/%E5%AE%89%E8%A3%85.html' },
          { url: '/zh/docs/25.09/%E4%B8%AD%E6%96%87/%E5%AE%89%E8%A3%85.html' },
        ],
        srcDir,
      );

      expect(absoluteItem.lastmod).toBe(isoTime);
      expect(relativeItem.lastmod).toBe(isoTime);
    });

    it('目录 URL 回退查找 index.md', async () => {
      fs.writeFileSync(
        sidecarPath,
        JSON.stringify({
          '25.09::zh/server/index.md': isoTime,
          '25.09::en/server.md': isoTime,
        }),
        'utf-8',
      );

      const { applySitemapMetadata } = await loadModule();
      const [dirItem, indexHtmlItem, enItem] = applySitemapMetadata(
        [
          { url: 'https://docs.openeuler.org/zh/docs/25.09/server/' },
          { url: 'https://docs.openeuler.org/zh/docs/25.09/server/index.html' },
          { url: 'https://docs.openeuler.org/en/docs/25.09/server.html' },
        ],
        srcDir,
      );

      expect(dirItem.lastmod).toBe(isoTime);
      expect(indexHtmlItem.lastmod).toBe(isoTime);
      expect(enItem.lastmod).toBe(isoTime);
    });

    it('版本根目录 URL 查找 locale 根 index.md', async () => {
      fs.writeFileSync(
        sidecarPath,
        JSON.stringify({
          '25.09::zh/index.md': isoTime,
        }),
        'utf-8',
      );

      const { applySitemapMetadata } = await loadModule();
      const [item] = applySitemapMetadata([{ url: 'https://docs.openeuler.org/zh/docs/25.09/' }], srcDir);

      expect(item.lastmod).toBe(isoTime);
    });
  });

  describe('changefreq/priority frontmatter', () => {
    it('frontmatter 声明 changefreq / priority 时直接取用并归一化', async () => {
      writeDocsMd(
        path.join('zh', 'docs', '25.09', 'install.md'),
        '---\ntitle: 安装\nchangefreq: Daily\npriority: "0.8"\n---\n正文\n',
      );
      const { applySitemapMetadata } = await loadModule();

      const [item] = applySitemapMetadata([{ url: 'https://docs.openeuler.org/zh/docs/25.09/install.html' }], srcDir);

      expect(item.changefreq).toBe('daily');
      expect(item.priority).toBe(0.8);
    });

    it('frontmatter 未声明时不产出 changefreq / priority', async () => {
      writeDocsMd(path.join('en', 'docs', '25.09', 'kernel.md'), '---\ntitle: Kernel\n---\nbody\n');
      const { applySitemapMetadata } = await loadModule();

      const [item] = applySitemapMetadata([{ url: 'https://docs.openeuler.org/en/docs/25.09/kernel.html' }], srcDir);

      expect('changefreq' in item).toBe(false);
      expect('priority' in item).toBe(false);
    });

    it('非法取值忽略并告警', async () => {
      writeDocsMd(
        path.join('zh', 'docs', '25.09', 'bad.md'),
        '---\nchangefreq: sometimes\npriority: 1.5\n---\n正文\n',
      );
      const { applySitemapMetadata } = await loadModule();

      const [item] = applySitemapMetadata([{ url: '/zh/docs/25.09/bad.html' }], srcDir);

      expect('changefreq' in item).toBe(false);
      expect('priority' in item).toBe(false);
      expect(console.warn).toHaveBeenCalledTimes(2);
    });

    it('目录 URL 回退读取 index.md，并支持中文路径解码', async () => {
      writeDocsMd(
        path.join('zh', 'docs', '25.09', '中文', 'index.md'),
        '---\nchangefreq: weekly\npriority: 0\n---\n正文\n',
      );
      const { applySitemapMetadata } = await loadModule();

      const [item] = applySitemapMetadata(
        [{ url: 'https://docs.openeuler.org/zh/docs/25.09/%E4%B8%AD%E6%96%87/' }],
        srcDir,
      );

      expect(item.changefreq).toBe('weekly');
      expect(item.priority).toBe(0);
    });

    it('非文档页 URL 与源文件缺失时保持原样', async () => {
      const { applySitemapMetadata } = await loadModule();

      const items = applySitemapMetadata(
        [{ url: 'https://docs.openeuler.org/zh/' }, { url: '/zh/docs/25.09/missing.html' }],
        srcDir,
      );

      expect(items[0].changefreq).toBeUndefined();
      expect(items[1].changefreq).toBeUndefined();
    });

    it('读取源文件失败时跳过且不中断', async () => {
      // 以目录冒充 md 文件，读取时抛 EISDIR
      fs.mkdirSync(path.join(srcDir, 'zh', 'docs', '25.09', 'broken.md'), { recursive: true });
      const { applySitemapMetadata } = await loadModule();

      const [item] = applySitemapMetadata([{ url: '/zh/docs/25.09/broken.html' }], srcDir);

      expect('changefreq' in item).toBe(false);
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('原地修改并返回同一数组', async () => {
      writeDocsMd(path.join('zh', 'docs', '25.09', 'a.md'), '---\nchangefreq: yearly\n---\n');
      const { applySitemapMetadata } = await loadModule();

      const items = [{ url: '/zh/docs/25.09/a.html', lastmod: '' }];
      const result = applySitemapMetadata(items, srcDir);

      expect(result).toBe(items);
      expect(items[0].lastmod).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(items[0].changefreq).toBe('yearly');
    });
  });
});
