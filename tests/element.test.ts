import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOffsetTop, getScrollRemainingBottom, isDocument, isElementVisible, isOverlap } from '../app/.vitepress/src/utils/element';

function mockRect(overrides: Partial<DOMRect>): DOMRect {
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...overrides,
  } as DOMRect;
}

describe('getOffsetTop', () => {
  it('相对于 Window 计算偏移量', () => {
    const el = document.createElement('div');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 100 }));
    const result = getOffsetTop(el, window);
    expect(result).toBe(100 - document.documentElement.clientTop);
  });

  it('相对于容器元素计算偏移量', () => {
    const el = document.createElement('div');
    const container = document.createElement('div');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 200 }));
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 50 }));
    const result = getOffsetTop(el, container);
    expect(result).toBe(150);
  });
});

describe('isDocument', () => {
  it('对 document 实例返回 true', () => {
    expect(isDocument(document)).toBe(true);
  });

  it('对 constructor.name 为 HTMLDocument 的对象返回 true', () => {
    const fakeDoc = { constructor: { name: 'HTMLDocument' } };
    expect(isDocument(fakeDoc)).toBe(true);
  });

  it('对非 document 值返回 false', () => {
    expect(isDocument(null)).toBe(false);
    expect(isDocument(undefined)).toBe(false);
    expect(isDocument({})).toBe(false);
    expect(isDocument(document.createElement('div'))).toBe(false);
    expect(isDocument('string')).toBe(false);
    expect(isDocument(42)).toBe(false);
  });
});

describe('isElementVisible', () => {
  it('元素在父容器内可见时返回 true', () => {
    const parent = document.createElement('div');
    const el = document.createElement('div');
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 0, bottom: 300 }));
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 50, bottom: 150 }));
    expect(isElementVisible(el, parent)).toBe(true);
  });

  it('元素在父容器外时返回 false', () => {
    const parent = document.createElement('div');
    const el = document.createElement('div');
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 0, bottom: 100 }));
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 200, bottom: 300 }));
    expect(isElementVisible(el, parent)).toBe(false);
  });

  it('min 参数生效：可见高度小于 min 时返回 false', () => {
    const parent = document.createElement('div');
    const el = document.createElement('div');
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 0, bottom: 100 }));
    // 元素从 90 到 200，在父容器内只有 10px 可见
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 90, bottom: 200 }));
    expect(isElementVisible(el, parent, 20)).toBe(false);
    expect(isElementVisible(el, parent, 5)).toBe(true);
  });

  it('元素部分可见（顶部裁剪）时的可见高度计算', () => {
    const parent = document.createElement('div');
    const el = document.createElement('div');
    // 父容器: 0-200, 元素: -50 到 100 → 可见区域: 0-100, 高度=100
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 0, bottom: 200 }));
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect({ top: -50, bottom: 100 }));
    expect(isElementVisible(el, parent, 50)).toBe(true);
  });
});

describe('getScrollRemainingBottom', () => {
  it('返回剩余滚动距离', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollTop', { value: 100, configurable: true });
    Object.defineProperty(container, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 300, configurable: true });
    // 500 - (100 + 300) = 100
    expect(getScrollRemainingBottom(container)).toBe(100);
  });

  it('滚动到底时返回 0', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollTop', { value: 200, configurable: true });
    Object.defineProperty(container, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 300, configurable: true });
    // 500 - (200 + 300) = 0
    expect(getScrollRemainingBottom(container)).toBe(0);
  });

  it('超出底部时返回 0', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollTop', { value: 300, configurable: true });
    Object.defineProperty(container, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 300, configurable: true });
    // 500 - (300 + 300) = -100 → 0
    expect(getScrollRemainingBottom(container)).toBe(0);
  });
});

describe('isOverlap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('两元素重叠时返回 true', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    vi.spyOn(a, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 0, bottom: 100, left: 0, right: 100 }));
    vi.spyOn(b, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 50, bottom: 150, left: 50, right: 150 }));
    expect(isOverlap(a, b)).toBe(true);
  });

  it('两元素水平不重叠时返回 false', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    vi.spyOn(a, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 0, bottom: 100, left: 0, right: 100 }));
    vi.spyOn(b, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 0, bottom: 100, left: 200, right: 300 }));
    expect(isOverlap(a, b)).toBe(false);
  });

  it('两元素垂直不重叠时返回 false', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    vi.spyOn(a, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 0, bottom: 100, left: 0, right: 100 }));
    vi.spyOn(b, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 200, bottom: 300, left: 0, right: 100 }));
    expect(isOverlap(a, b)).toBe(false);
  });

  it('两元素边缘相接但不重叠时返回 false', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    vi.spyOn(a, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 0, bottom: 100, left: 0, right: 100 }));
    vi.spyOn(b, 'getBoundingClientRect').mockReturnValue(mockRect({ top: 0, bottom: 100, left: 100, right: 200 }));
    // rect1.right === rect2.left → 不重叠
    expect(isOverlap(a, b)).toBe(false);
  });

  it('document 未定义时返回 false', () => {
    vi.stubGlobal('document', undefined);
    const a = {} as Element;
    const b = {} as Element;
    expect(isOverlap(a, b)).toBe(false);
  });
});
