import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

import Cookies from 'js-cookie';
import { getCustomCookie, removeCustomCookie, setCustomCookie } from '../app/.vitepress/src/utils/cookie';

describe('getCustomCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('返回指定 key 的 cookie 值', () => {
    (Cookies.get as ReturnType<typeof vi.fn>).mockReturnValue('test-value');
    const result = getCustomCookie('test-key');
    expect(Cookies.get).toHaveBeenCalledWith('test-key');
    expect(result).toBe('test-value');
  });

  it('cookie 不存在时返回 undefined', () => {
    (Cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const result = getCustomCookie('nonexistent');
    expect(result).toBeUndefined();
  });
});

describe('setCustomCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('使用默认过期时间和域名设置 cookie', () => {
    setCustomCookie('myKey', 'myValue');
    expect(Cookies.set).toHaveBeenCalledWith('myKey', 'myValue', {
      expires: 180,
      path: '/',
      domain: location.hostname,
    });
  });

  it('使用自定义过期时间和域名设置 cookie', () => {
    setCustomCookie('myKey', 'myValue', 30, 'example.com');
    expect(Cookies.set).toHaveBeenCalledWith('myKey', 'myValue', {
      expires: 30,
      path: '/',
      domain: 'example.com',
    });
  });
});

describe('removeCustomCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('使用默认域名删除 cookie', () => {
    removeCustomCookie('myKey');
    expect(Cookies.remove).toHaveBeenCalledWith('myKey', {
      path: '/',
      domain: location.hostname,
    });
  });

  it('使用自定义域名删除 cookie', () => {
    removeCustomCookie('myKey', 'example.com');
    expect(Cookies.remove).toHaveBeenCalledWith('myKey', {
      path: '/',
      domain: 'example.com',
    });
  });
});
