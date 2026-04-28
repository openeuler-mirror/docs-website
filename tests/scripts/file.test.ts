import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { copyDirectorySync, copyFileSync, removeSync, ensureDirSync, renameSync } from '../../scripts/utils/file.js';

vi.spyOn(console, 'log').mockImplementation(() => {});

describe('removeSync', () => {
  const testDir = './test-temp-remove';

  afterEach(() => {
    vi.clearAllMocks();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('删除存在的目录', () => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'test.txt'), 'content');
    
    removeSync(testDir);
    expect(fs.existsSync(testDir)).toBe(false);
  });

  it('删除存在的文件', () => {
    const testFile = './test-temp-file.txt';
    fs.writeFileSync(testFile, 'content');
    
    removeSync(testFile);
    expect(fs.existsSync(testFile)).toBe(false);
  });

  it('静默模式下不输出日志', () => {
    fs.mkdirSync(testDir, { recursive: true });
    
    removeSync(testDir, true);
    expect(console.log).not.toHaveBeenCalled();
    expect(fs.existsSync(testDir)).toBe(false);
  });

  it('删除不存在的路径时不报错', () => {
    const nonExistent = './non-existent-path-12345';
    expect(() => removeSync(nonExistent)).not.toThrow();
  });

  it('删除存在路径时输出日志', () => {
    fs.mkdirSync(testDir, { recursive: true });
    
    removeSync(testDir);
    expect(console.log).toHaveBeenCalled();
  });
});

describe('ensureDirSync', () => {
  const testDir = './test-temp-ensure';

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('创建不存在的目录', () => {
    ensureDirSync(testDir);
    expect(fs.existsSync(testDir)).toBe(true);
    expect(fs.statSync(testDir).isDirectory()).toBe(true);
  });

  it('已存在目录时不报错', () => {
    fs.mkdirSync(testDir, { recursive: true });
    expect(() => ensureDirSync(testDir)).not.toThrow();
  });

  it('路径为文件时抛出错误', () => {
    const filePath = './test-temp-file.txt';
    fs.writeFileSync(filePath, 'content');
    
    expect(() => ensureDirSync(filePath)).toThrow('已存在但非目录');
    fs.unlinkSync(filePath);
  });

  it('创建嵌套目录', () => {
    const nestedDir = path.join(testDir, 'a', 'b', 'c');
    ensureDirSync(nestedDir);
    expect(fs.existsSync(nestedDir)).toBe(true);
  });
});

describe('copyFileSync', () => {
  const sourceFile = './test-source-file.txt';
  const destFile = './test-dest-file.txt';
  const destDir = './test-dest-dir';

  beforeEach(() => {
    vi.clearAllMocks();
    fs.writeFileSync(sourceFile, 'test content');
  });

  afterEach(() => {
    [sourceFile, destFile].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
  });

  it('复制文件到目标路径', () => {
    copyFileSync(sourceFile, destFile);
    expect(fs.existsSync(destFile)).toBe(true);
    expect(fs.readFileSync(destFile, 'utf-8')).toBe('test content');
  });

  it('复制文件到不存在的目录时创建目录', () => {
    const destPath = path.join(destDir, 'nested', 'file.txt');
    copyFileSync(sourceFile, destPath);
    expect(fs.existsSync(destPath)).toBe(true);
    expect(fs.readFileSync(destPath, 'utf-8')).toBe('test content');
  });

  it('源文件不存在时跳过并输出日志', () => {
    copyFileSync('./non-existent.txt', destFile);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('不存在'));
    expect(fs.existsSync(destFile)).toBe(false);
  });

  it('静默模式下不输出日志', () => {
    copyFileSync(sourceFile, destFile, true);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('非静默模式输出日志', () => {
    copyFileSync(sourceFile, destFile);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('成功复制'));
  });
});

describe('copyDirectorySync', () => {
  const sourceDir = './test-source-dir';
  const destDir = './test-dest-dir';

  beforeEach(() => {
    vi.clearAllMocks();
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'file1.txt'), 'content1');
    fs.mkdirSync(path.join(sourceDir, 'subdir'), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'subdir', 'file2.txt'), 'content2');
  });

  afterEach(() => {
    [sourceDir, destDir].forEach(d => {
      if (fs.existsSync(d)) {
        fs.rmSync(d, { recursive: true, force: true });
      }
    });
  });

  it('复制整个目录结构', () => {
    copyDirectorySync(sourceDir, destDir);
    expect(fs.existsSync(path.join(destDir, 'file1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'subdir', 'file2.txt'))).toBe(true);
  });

  it('源目录不存在时跳过并输出日志', () => {
    copyDirectorySync('./non-existent-dir', destDir);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('不存在'));
  });

  it('clearDestDir=true 时清空目标目录', () => {
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, 'old-file.txt'), 'old content');

    copyDirectorySync(sourceDir, destDir, true);
    expect(fs.existsSync(path.join(destDir, 'old-file.txt'))).toBe(false);
    expect(fs.existsSync(path.join(destDir, 'file1.txt'))).toBe(true);
  });

  it('静默模式不输出日志', () => {
    copyDirectorySync(sourceDir, destDir, false, true);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('非静默模式输出日志', () => {
    copyDirectorySync(sourceDir, destDir);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('成功复制'));
  });
});

describe('renameSync', () => {
  const oldPath = './test-old-path.txt';
  const newPath = './test-new-path.txt';

  beforeEach(() => {
    vi.clearAllMocks();
    fs.writeFileSync(oldPath, 'content');
  });

  afterEach(() => {
    [oldPath, newPath].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  });

  it('重命名文件', () => {
    renameSync(oldPath, newPath);
    expect(fs.existsSync(oldPath)).toBe(false);
    expect(fs.existsSync(newPath)).toBe(true);
    expect(fs.readFileSync(newPath, 'utf-8')).toBe('content');
  });

  it('静默模式不输出日志', () => {
    renameSync(oldPath, newPath, true);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('非静默模式输出日志', () => {
    renameSync(oldPath, newPath);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('重命名'));
  });

  it('源文件不存在时不执行操作', () => {
    renameSync('./non-existent.txt', './another.txt');
    expect(console.log).not.toHaveBeenCalled();
  });
});