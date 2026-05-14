import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './setup';
import {
  changeTimeStamp,
  disableTriggerScrollEvent,
  getDomId,
  getSearchUrlParams,
  getSourceUrl,
  getUrlParams,
  getVersionFromUrl,
  getYearByOffset,
  isValidKey,
  scrollToTop,
  windowOpen,
} from '../app/.vitepress/src/utils/common';

describe('changeTimeStamp', () => {
  it('获取格式化时间', () => {
    const date = new Date();
    const result = changeTimeStamp(date.getTime() / 1000);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const format = `${date.getFullYear()}/${month}/${day}`;
    expect(result).toBe(format);
  });
});

describe('windowOpen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('调用 window.open 并将 opener 置为 null', () => {
    const mockOpener = { opener: 'something' as any };
    vi.spyOn(window, 'open').mockReturnValue(mockOpener as any);
    windowOpen('http://example.com', '_blank', '');
    expect(window.open).toHaveBeenCalledWith('http://example.com', '_blank', '');
    expect(mockOpener.opener).toBeNull();
  });

  it('当 window.open 返回 null 时不报错', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(() => windowOpen('http://example.com')).not.toThrow();
  });
});

describe('getUrlParams', () => {
  it('存在 url 参数', () => {
    expect(getUrlParams('http://example.com?a=1')).toHaveProperty('a');
    expect(getUrlParams('http://example.com?a=1&b=2')).toHaveProperty('b');
  });

  it('不存在 url 参数', () => {
    expect(getUrlParams('http://example.com?a=1')).not.toHaveProperty('c');
    expect(getUrlParams('http://example.com?a=1&b=2')).not.toHaveProperty('c');
  });

  it('非法 url 地址', () => {
    expect(getUrlParams('sdfgdfsgasDKJBFSJKFB')).toBe(undefined);
  });
});

describe('disableTriggerScrollEvent', () => {
  it('阻止滚动事件向后续监听器传播', () => {
    const dom = document.createElement('div');
    document.body.appendChild(dom);

    const handler = vi.fn();
    const cancel = disableTriggerScrollEvent(dom);

    // 在禁用监听器之后再添加我们的 capture 监听器
    dom.addEventListener('scroll', handler, true);
    dom.dispatchEvent(new Event('scroll', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    // 取消禁用后，监听器正常触发
    cancel();
    dom.dispatchEvent(new Event('scroll', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    dom.removeEventListener('scroll', handler, true);
    document.body.removeChild(dom);
  });
});

describe('scrollToTop', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('当 DOM 元素不存在时不报错', () => {
    expect(() => scrollToTop()).not.toThrow();
  });

  it('执行即时滚动（smooth=false）', () => {
    document.body.innerHTML = `<div id="app"><div class="o-scroller"><div class="o-scroller-container"></div></div></div>`;
    const dom = document.querySelector('#app > .o-scroller > .o-scroller-container') as HTMLElement;
    const scrollToFn = vi.fn();
    dom.scrollTo = scrollToFn as any;
    scrollToTop(100, false, false);
    expect(scrollToFn).toHaveBeenCalledWith({ top: 100, behavior: 'instant' });
  });

  it('执行平滑滚动（smooth=true）', () => {
    document.body.innerHTML = `<div id="app"><div class="o-scroller"><div class="o-scroller-container"></div></div></div>`;
    const dom = document.querySelector('#app > .o-scroller > .o-scroller-container') as HTMLElement;
    const scrollToFn = vi.fn();
    dom.scrollTo = scrollToFn as any;
    scrollToTop(0, true);
    expect(scrollToFn).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('disableScrollEvent=true 时禁用再恢复滚动事件', () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<div id="app"><div class="o-scroller"><div class="o-scroller-container"></div></div></div>`;
    const dom = document.querySelector('#app > .o-scroller > .o-scroller-container') as HTMLElement;
    dom.scrollTo = vi.fn() as any;

    // 先调用 scrollToTop 注册 stopper，再添加 handler（stopper 必须先于 handler 注册）
    scrollToTop(0, false, true);

    const handler = vi.fn();
    dom.addEventListener('scroll', handler, true);

    dom.dispatchEvent(new Event('scroll', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    vi.runAllTimers();
    dom.dispatchEvent(new Event('scroll', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    dom.removeEventListener('scroll', handler, true);
    vi.useRealTimers();
  });
});

describe('getSearchUrlParams', () => {
  it('getSearchUrlParams', () => {
    const result = getSearchUrlParams('http://example.com?a=1&b=2');
    expect(result.get('a')).toBe('1');
  });
});

describe('isValidKey', () => {
  it('key 为 string', () => {
    const obj1 = { key: 1 };
    expect(isValidKey('key', obj1)).toBe(true);
    expect(isValidKey('b', obj1)).toBe(false);
  });

  it('key 为 number', () => {
    const obj1 = { 1: 1 };
    expect(isValidKey(1, obj1)).toBe(true);
    expect(isValidKey(2, obj1)).toBe(false);
  });

  it('key 为 symbol', () => {
    const symbol1 = Symbol('key1');
    const symbol2 = Symbol('key2');
    const obj1 = { [symbol1]: 1 };
    expect(isValidKey(symbol1, obj1)).toBe(true);
    expect(isValidKey(symbol2, obj1)).toBe(false);
  });
});

describe('getYearByOffset', () => {
  it('getYearByOffset', () => {
    const date = new Date();
    expect(getYearByOffset()).toBe(date.getFullYear());
  });
});

describe('getSourceUrl', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/zh/docs/25.03/server/index.html' },
      writable: true,
      configurable: true,
    });
  });

  it('当 node 为 null 时返回空字符串', () => {
    expect(getSourceUrl(null)).toBe('');
  });

  it('当 node 有 upstream 时替换 gitee 为 atomgit', () => {
    const node = { upstream: 'https://gitee.com/openeuler/docs/blob/stable-25.03/docs/zh/server/index.md' } as any;
    const result = getSourceUrl(node);
    expect(result).toContain('atomgit.com');
    expect(result).not.toContain('gitee');
  });

  it('pathname 以 .html 结尾时构建正确 URL', () => {
    const node = { upstream: '' } as any;
    const result = getSourceUrl(node);
    expect(result).toBe('https://atomgit.com/openeuler/docs/blob/stable-25.03/docs/zh/server/index.md');
  });

  it('pathname 以 / 结尾时拼接 index.md', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/zh/docs/25.03/server/' },
      writable: true,
      configurable: true,
    });
    const node = { upstream: '' } as any;
    const result = getSourceUrl(node);
    expect(result).toBe('https://atomgit.com/openeuler/docs/blob/stable-25.03/docs/zh/server/index.md');
  });

  it('pathname 无特殊后缀时拼接 .md', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/zh/docs/common/contribute/guide' },
      writable: true,
      configurable: true,
    });
    const node = { upstream: '' } as any;
    const result = getSourceUrl(node);
    expect(result).toBe('https://atomgit.com/openeuler/docs/blob/stable-common/docs/zh/contribute/guide.md');
  });

  it('各版本分支映射正确', () => {
    const cases: Array<[string, string]> = [
      ['25.09', 'stable-25.09'],
      ['24.03_LTS_SP1', 'stable-24.03_LTS_SP1'],
      ['24.03_LTS_SP2', 'stable-24.03_LTS_SP2'],
      ['24.03_LTS_SP3', 'stable-24.03_LTS_SP3'],
      ['22.03_LTS_SP4', 'stable-22.03_LTS_SP4'],
    ];
    cases.forEach(([branch, stable]) => {
      Object.defineProperty(window, 'location', {
        value: { pathname: `/zh/docs/${branch}/index.html` },
        writable: true,
        configurable: true,
      });
      expect(getSourceUrl({ upstream: '' } as any)).toContain(stable);
    });
  });
});

describe('getVersionFromUrl', () => {
  it('以 / 开头时从第4段获取版本', () => {
    expect(getVersionFromUrl('/zh/docs/25.03/server/index.html')).toBe('25.03');
    expect(getVersionFromUrl('/zh/docs/common/contribute/directory_structure_introductory.html')).toBe('common');
  });

  it('不以 / 开头时从第3段获取版本', () => {
    expect(getVersionFromUrl('zh/docs/25.03/server/index.html')).toBe('25.03');
  });

  it('url 太短时返回空字符串', () => {
    expect(getVersionFromUrl('/')).toBe('');
  });
});

describe('getDomId', () => {
  it('getDomId', () => {
    expect(getDomId('aa bb cc')).toBe('aa-bb-cc');
    expect(getDomId('a&b')).toBe('ab');
    expect(getDomId('a-c')).toBe('a-c');
  });
});

describe('scrollToTop - 非客户端环境', () => {
  it('isClient 为 false 时提前返回', async () => {
    vi.resetModules();
    vi.doMock('@opensig/opendesign', () => ({ isClient: false }));
    const { scrollToTop: scrollToTopMock } = await import('../app/.vitepress/src/utils/common');
    expect(() => scrollToTopMock()).not.toThrow();
    vi.doUnmock('@opensig/opendesign');
  });
});
