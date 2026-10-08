/**
 * @vitest-environment node
 */
import fs from 'fs';
import os from 'node:os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const isoTime = '2026-01-02T03:04:05.000Z';

describe('sitemap-lastmod sidecar', () => {
  let tmpDir = '';
  let sidecarPath = '';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-lastmod-'));
    sidecarPath = path.join(tmpDir, 'docs-lastmod.json');
    process.env.DOCS_LASTMOD_FILE = sidecarPath;
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.DOCS_LASTMOD_FILE;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  async function loadModule() {
    vi.resetModules();
    const mod = await import('../app/.vitepress/src/utils/sitemap-lastmod');
    return mod;
  }

  it('sidecar 缺失时回退为构建时间', async () => {
    const { applySitemapLastmod } = await loadModule();
    const [item] = applySitemapLastmod([{ url: 'https://docs.openeuler.org/zh/docs/25.09/missing.html' }]);

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

    const { applySitemapLastmod } = await loadModule();
    const [absoluteItem, relativeItem] = applySitemapLastmod([
      { url: 'https://docs.openeuler.org/zh/docs/25.09/%E4%B8%AD%E6%96%87/%E5%AE%89%E8%A3%85.html' },
      { url: '/zh/docs/25.09/%E4%B8%AD%E6%96%87/%E5%AE%89%E8%A3%85.html' },
    ]);

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

    const { applySitemapLastmod } = await loadModule();
    const [dirItem, indexHtmlItem, enItem] = applySitemapLastmod([
      { url: 'https://docs.openeuler.org/zh/docs/25.09/server/' },
      { url: 'https://docs.openeuler.org/zh/docs/25.09/server/index.html' },
      { url: 'https://docs.openeuler.org/en/docs/25.09/server.html' },
    ]);

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

    const { applySitemapLastmod } = await loadModule();
    const [item] = applySitemapLastmod([{ url: 'https://docs.openeuler.org/zh/docs/25.09/' }]);

    expect(item.lastmod).toBe(isoTime);
  });
});
