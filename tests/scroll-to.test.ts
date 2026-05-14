import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './setup';
import { easeInOutCubic, getScroll, scrollIntoView, scrollTo } from '../app/.vitepress/src/utils/scroll-to';

describe('getScroll', () => {
  it('el 为 null/falsy 时返回 {0, 0}', () => {
    expect(getScroll(null as any)).toEqual({ scrollLeft: 0, scrollTop: 0 });
  });

  it('el 为 Window 时返回 window.scrollX/Y', () => {
    Object.defineProperty(window, 'scrollX', { value: 10, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 20, configurable: true });
    const result = getScroll(window);
    expect(result.scrollLeft).toBe(10);
    expect(result.scrollTop).toBe(20);
  });

  it('el 为 Document 时返回 documentElement 的 scroll 值', () => {
    Object.defineProperty(document.documentElement, 'scrollLeft', { value: 5, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 15, configurable: true });
    const result = getScroll(document);
    expect(result.scrollLeft).toBe(5);
    expect(result.scrollTop).toBe(15);
  });

  it('el 为 HTMLElement 时返回元素自身的 scroll 值', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollLeft', { value: 30, configurable: true });
    Object.defineProperty(el, 'scrollTop', { value: 40, configurable: true });
    const result = getScroll(el);
    expect(result.scrollLeft).toBe(30);
    expect(result.scrollTop).toBe(40);
  });
});

describe('easeInOutCubic', () => {
  it('起始点返回 start', () => {
    // current=0, start=0, end=100, duration=100 → time=0/50=0, (50)*0 + 0 = 0
    expect(easeInOutCubic(0, 0, 100, 100)).toBe(0);
  });

  it('中间点返回中间值', () => {
    // current=50, start=0, end=100, duration=100 → time=50/50=1 → time-=2=-1
    // (50) * ((-1)^3 + 2) + 0 = 50 * 1 = 50
    expect(easeInOutCubic(50, 0, 100, 100)).toBe(50);
  });

  it('结束点返回 end', () => {
    // current=100, start=0, end=100, duration=100 → time=100/50=2 → time-=2=0
    // (50) * (0 + 2) + 0 = 100
    expect(easeInOutCubic(100, 0, 100, 100)).toBe(100);
  });

  it('time < 1 时使用加速曲线', () => {
    // current=10, start=0, end=100, duration=100 → time=10/50=0.2
    // (50) * 0.2^3 + 0 = 50 * 0.008 = 0.4
    expect(easeInOutCubic(10, 0, 100, 100)).toBeCloseTo(0.4, 5);
  });

  it('非零 start 时正确计算', () => {
    // start=50, end=150, current=0 → time=0 → 0 + 50 = 50
    expect(easeInOutCubic(0, 50, 150, 100)).toBe(50);
    // start=50, end=150, current=100 → time=2, time-2=0 → (50)*(0+2)+50 = 150
    expect(easeInOutCubic(100, 50, 150, 100)).toBe(150);
  });
});

describe('scrollTo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('使用 HTMLElement 容器滚动并解析为 done', async () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollTop', { value: 0, writable: true, configurable: true });

    const promise = scrollTo(100, { container, duration: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('done');
  });

  it('使用 Window 容器滚动', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const promise = scrollTo(100, { container: window, duration: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('done');
    expect(scrollToSpy).toHaveBeenCalled();
  });

  it('使用 Document 容器滚动', async () => {
    Object.defineProperty(document.documentElement, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true,
    });
    const promise = scrollTo(100, { container: document, duration: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('done');
  });

  it('对同一容器再次调用 scrollTo 会取消上一次', async () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollTop', { value: 0, writable: true, configurable: true });

    // 第一次调用（duration 很长，确保还在进行中）
    const promise1 = scrollTo(500, { container, duration: 10000 });

    // 推进一帧，让第一次的 frameFn 运行并将 canceller 注册到 cancelScrollRAFMap
    await vi.advanceTimersByTimeAsync(16);

    // 第二次调用，此时 canceller 已注册，会取消第一次
    const promise2 = scrollTo(100, { container, duration: 100 });

    await vi.runAllTimersAsync();

    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toBe('cancel');
    expect(result2).toBe('done');
  });

  it('使用默认参数（container=window, duration=450）', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const promise = scrollTo(0, {});
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('done');
  });
});

describe('scrollIntoView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('计算正确的 y 值并滚动', async () => {
    const target = document.createElement('div');
    const scrollContainer = document.createElement('div');

    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 200, bottom: 300, left: 0, right: 100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    vi.spyOn(scrollContainer, 'getBoundingClientRect').mockReturnValue({
      top: 50, bottom: 500, left: 0, right: 100, width: 100, height: 450, x: 0, y: 0, toJSON: () => ({}),
    });
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 0, writable: true, configurable: true });

    const promise = scrollIntoView(target, scrollContainer, 100, 100);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('done');
  });
});
