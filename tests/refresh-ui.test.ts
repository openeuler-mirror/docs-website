import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../app/.vitepress/src/utils/element', () => ({
  isElementVisible: vi.fn(),
}));

vi.mock('../app/.vitepress/src/utils/scroll-to', () => ({
  scrollIntoView: vi.fn(),
}));

import { isElementVisible } from '../app/.vitepress/src/utils/element';
import { scrollIntoView } from '../app/.vitepress/src/utils/scroll-to';
import { refreshSelectedMenuItemPosition } from '../app/.vitepress/src/utils/refresh-ui';

describe('refreshSelectedMenuItemPosition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    vi.clearAllMocks();
    (scrollIntoView as ReturnType<typeof vi.fn>).mockResolvedValue('done');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parent 不存在时不调用 scrollIntoView', () => {
    refreshSelectedMenuItemPosition();
    vi.runAllTimers();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('active menu item 不存在时不调用 scrollIntoView', () => {
    document.body.innerHTML = `
      <div id="menuScrollDom">
        <div class="o-scroller-container"></div>
      </div>
    `;
    refreshSelectedMenuItemPosition();
    vi.runAllTimers();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('元素不可见时调用 scrollIntoView（使用 .o-sub-menu-title）', () => {
    document.body.innerHTML = `
      <div id="menuScrollDom">
        <div class="o-scroller-container">
          <div id="rec-active-menu-item">
            <div class="o-sub-menu-title">Item</div>
          </div>
        </div>
      </div>
    `;
    (isElementVisible as ReturnType<typeof vi.fn>).mockReturnValue(false);

    refreshSelectedMenuItemPosition();
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('元素可见时不调用 scrollIntoView', () => {
    document.body.innerHTML = `
      <div id="menuScrollDom">
        <div class="o-scroller-container">
          <div id="rec-active-menu-item">
            <div class="o-sub-menu-title">Item</div>
          </div>
        </div>
      </div>
    `;
    (isElementVisible as ReturnType<typeof vi.fn>).mockReturnValue(true);

    refreshSelectedMenuItemPosition();
    vi.runAllTimers();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('无 .o-sub-menu-title 时使用 #rec-active-menu-item 作为目标', () => {
    document.body.innerHTML = `
      <div id="menuScrollDom">
        <div class="o-scroller-container">
          <div id="rec-active-menu-item">直接菜单项</div>
        </div>
      </div>
    `;
    (isElementVisible as ReturnType<typeof vi.fn>).mockReturnValue(false);

    refreshSelectedMenuItemPosition();
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('多次调用时只执行最后一次（防抖）', () => {
    document.body.innerHTML = `
      <div id="menuScrollDom">
        <div class="o-scroller-container">
          <div id="rec-active-menu-item">
            <div class="o-sub-menu-title">Item</div>
          </div>
        </div>
      </div>
    `;
    (isElementVisible as ReturnType<typeof vi.fn>).mockReturnValue(false);

    refreshSelectedMenuItemPosition();
    refreshSelectedMenuItemPosition();
    refreshSelectedMenuItemPosition();
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
