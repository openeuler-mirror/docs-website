/**
 * @vitest-environment node
 */
import fs from 'fs';
import os from 'node:os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const gitMocks = vi.hoisted(() => ({
  isGitRepo: vi.fn(),
  getDirectoryLastCommitMap: vi.fn(),
  getFileLastCommitIso: vi.fn(),
}));

vi.mock('../../scripts/utils/git.js', () => ({
  isGitRepo: gitMocks.isGitRepo,
  getDirectoryLastCommitMap: gitMocks.getDirectoryLastCommitMap,
  getFileLastCommitIso: gitMocks.getFileLastCommitIso,
}));

import {
  createLastmodCollector,
  getSiteContext,
  loadLastmodStore,
  recordMdDirectoryLastmod,
  recordMdFileLastmod,
  saveLastmodStore,
} from '../../scripts/utils/lastmod.js';

describe('lastmod sidecar utils', () => {
  let tmpDir = '';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lastmod-'));
    gitMocks.isGitRepo.mockReset().mockReturnValue(true);
    gitMocks.getDirectoryLastCommitMap.mockReset().mockReturnValue(new Map());
    gitMocks.getFileLastCommitIso.mockReset().mockReturnValue('');
    delete process.env.DOCS_LASTMOD_FILE;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function writeFile(target: string, content = '# doc') {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf-8');
  }

  describe('getSiteContext', () => {
    it('解析中文站点上下文', () => {
      const target = path.join(tmpDir, 'app/zh/docs/25.09/cloud/index.md');
      const ctx = getSiteContext(target);
      expect(ctx?.locale).toBe('zh');
      expect(ctx?.version).toBe('25.09');
      expect(ctx?.versionRoot.replace(/\\/g, '/')).toContain('/app/zh/docs/25.09');
    });

    it('解析英文站点根版本目录', () => {
      const target = path.join(tmpDir, 'app/en/docs/26.09');
      expect(getSiteContext(target)?.locale).toBe('en');
    });

    it('站点目录外返回 null', () => {
      expect(getSiteContext(path.join(tmpDir, 'other/file.md'))).toBeNull();
    });
  });

  describe('recordMdDirectoryLastmod', () => {
    it('批量命中目录内 md 文件并生成站点 key', () => {
      const repoDir = path.join(tmpDir, 'repo');
      const sourceDir = path.join(repoDir, 'docs/zh');
      const targetDir = path.join(tmpDir, 'app/zh/docs/25.09');
      writeFile(path.join(sourceDir, 'a.md'));
      writeFile(path.join(sourceDir, 'sub/b.md'));
      writeFile(path.join(sourceDir, 'ignore.txt'));

      gitMocks.getDirectoryLastCommitMap.mockReturnValue(
        new Map([
          ['docs/zh/a.md', '2026-01-01T00:00:00.000Z'],
          ['docs/zh/sub/b.md', '2026-01-02T00:00:00.000Z'],
        ]),
      );

      const store = {};
      const count = recordMdDirectoryLastmod(store, { repoDir, sourceDir, targetDir });

      expect(count).toBe(2);
      expect(store).toEqual({
        '25.09::zh/a.md': '2026-01-01T00:00:00.000Z',
        '25.09::zh/sub/b.md': '2026-01-02T00:00:00.000Z',
      });
      expect(gitMocks.getFileLastCommitIso).not.toHaveBeenCalled();
    });

    it('批量未命中时逐文件查询 fallback', () => {
      const repoDir = path.join(tmpDir, 'repo');
      const sourceDir = path.join(repoDir, 'docs/en');
      const targetDir = path.join(tmpDir, 'app/en/docs/26.09/cloud');
      writeFile(path.join(sourceDir, 'missing.md'));

      gitMocks.getFileLastCommitIso.mockReturnValue('2026-02-02T00:00:00.000Z');

      const store = {};
      const count = recordMdDirectoryLastmod(store, { repoDir, sourceDir, targetDir });

      expect(count).toBe(1);
      expect(gitMocks.getFileLastCommitIso).toHaveBeenCalledWith(repoDir, 'docs/en/missing.md');
      expect(store['26.09::en/cloud/missing.md']).toBe('2026-02-02T00:00:00.000Z');
    });

    it('目标不在站点 docs 下或源不是 git 仓库时不记录', () => {
      const repoDir = path.join(tmpDir, 'repo');
      const sourceDir = path.join(repoDir, 'docs/zh');
      writeFile(path.join(sourceDir, 'a.md'));

      const outsideStore = {};
      expect(recordMdDirectoryLastmod(outsideStore, { repoDir, sourceDir, targetDir: path.join(tmpDir, 'other/zh') })).toBe(0);
      expect(outsideStore).toEqual({});

      gitMocks.isGitRepo.mockReturnValue(false);
      const nonGitStore = {};
      const count = recordMdDirectoryLastmod(nonGitStore, {
        repoDir,
        sourceDir,
        targetDir: path.join(tmpDir, 'app/zh/docs/25.09'),
      });
      expect(count).toBe(0);
      expect(nonGitStore).toEqual({});
    });
  });

  describe('recordMdFileLastmod', () => {
    it('记录单个重命名复制的 md 文件', () => {
      const repoDir = path.join(tmpDir, 'repo');
      const sourceFile = path.join(repoDir, 'doc/user/manual.md');
      const targetFile = path.join(tmpDir, 'app/zh/docs/25.09/devstation/manual.md');
      writeFile(sourceFile);

      gitMocks.getFileLastCommitIso.mockReturnValue('2026-03-03T00:00:00.000Z');

      const store = {};
      expect(recordMdFileLastmod(store, { repoDir, sourceFile, targetFile })).toBe(true);
      expect(store['25.09::zh/devstation/manual.md']).toBe('2026-03-03T00:00:00.000Z');
    });

    it('无提交时间时不记录', () => {
      const repoDir = path.join(tmpDir, 'repo');
      const sourceFile = path.join(repoDir, 'doc/user/manual.md');
      const targetFile = path.join(tmpDir, 'app/en/docs/25.09/manual.md');
      writeFile(sourceFile);

      const store = {};
      expect(recordMdFileLastmod(store, { repoDir, sourceFile, targetFile })).toBe(false);
      expect(store).toEqual({});
    });
  });

  describe('collector persistence', () => {
    it('按 env 路径读写 sidecar 并清理旧版本', () => {
      const filePath = path.join(tmpDir, 'nested/.cache/docs-lastmod.json');
      process.env.DOCS_LASTMOD_FILE = filePath;

      const first = createLastmodCollector(tmpDir);
      first.store['25.09::zh/a.md'] = '2026-01-01T00:00:00.000Z';
      first.store['common::zh/a.md'] = '2026-01-02T00:00:00.000Z';
      first.save();

      expect(fs.existsSync(filePath)).toBe(true);

      const second = createLastmodCollector(tmpDir);
      second.clearVersion('25.09');
      second.store['26.09::en/a.md'] = '2026-01-03T00:00:00.000Z';
      second.save();

      const persisted = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(persisted).toEqual({
        'common::zh/a.md': '2026-01-02T00:00:00.000Z',
        '26.09::en/a.md': '2026-01-03T00:00:00.000Z',
      });
    });

    it('JSON 损坏时读取为空且不抛错', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const filePath = path.join(tmpDir, 'broken.json');
      fs.writeFileSync(filePath, 'not-json', 'utf-8');

      expect(loadLastmodStore(filePath)).toEqual({});
      expect(warnSpy).toHaveBeenCalled();
    });

    it('save 写入失败时不抛错', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const blocker = path.join(tmpDir, 'blocker');
      const filePath = path.join(blocker, 'nested/docs-lastmod.json');
      fs.writeFileSync(blocker, 'file', 'utf-8');

      expect(() => saveLastmodStore(filePath, { a: 'b' })).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
