import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBranchName, parseNamedArgs, sleep } from '../../scripts/utils/common.js';

describe('getBranchName', () => {
  it('移除 stable2- 前缀', () => {
    expect(getBranchName('stable2-22.03')).toBe('22.03');
  });

  it('移除 stable- 前缀', () => {
    expect(getBranchName('stable-22.03')).toBe('22.03');
  });

  it('移除 test- 前缀', () => {
    expect(getBranchName('test-branch')).toBe('branch');
  });

  it('无前缀时返回原值', () => {
    expect(getBranchName('main')).toBe('main');
  });

  it('多次匹配只移除一次', () => {
    expect(getBranchName('stable-test-branch')).toBe('test-branch');
  });

  it('处理空字符串', () => {
    expect(getBranchName('')).toBe('');
  });
});

describe('parseNamedArgs', () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  it('解析 --key=value 格式参数', () => {
    process.argv = ['node', 'script.js', '--name=test', '--version=1.0'];
    const result = parseNamedArgs();
    expect(result.name).toBe('test');
    expect(result.version).toBe('1.0');
  });

  it('解析 --key value 格式参数', () => {
    process.argv = ['node', 'script.js', '--name', 'test'];
    const result = parseNamedArgs();
    expect(result.name).toBe('test');
  });

  it('解析无值参数为 true', () => {
    process.argv = ['node', 'script.js', '--verbose'];
    const result = parseNamedArgs();
    expect(result.verbose).toBe(true);
  });

  it('无值参数后跟另一个参数时为 true', () => {
    process.argv = ['node', 'script.js', '--verbose', '--other'];
    const result = parseNamedArgs();
    expect(result.verbose).toBe(true);
    expect(result.other).toBe(true);
  });

  it('忽略非命名参数', () => {
    process.argv = ['node', 'script.js', 'positional', '--name', 'test'];
    const result = parseNamedArgs();
    expect(result.name).toBe('test');
    expect(result).not.toHaveProperty('positional');
  });

  it('空参数返回空对象', () => {
    process.argv = ['node', 'script.js'];
    const result = parseNamedArgs();
    expect(Object.keys(result).length).toBe(0);
  });

  it('混合多种格式参数', () => {
    process.argv = ['node', 'script.js', '--key1=value1', '--key2', 'value2', '--flag'];
    const result = parseNamedArgs();
    expect(result.key1).toBe('value1');
    expect(result.key2).toBe('value2');
    expect(result.flag).toBe(true);
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('返回 Promise', () => {
    const result = sleep(100);
    expect(result).toBeInstanceOf(Promise);
  });

  it('在指定时间后 resolve', async () => {
    const result = sleep(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toBeUndefined();
  });

  it('支持 0 毫秒', async () => {
    const result = sleep(0);
    await vi.advanceTimersByTimeAsync(0);
    await expect(result).resolves.toBeUndefined();
  });
});