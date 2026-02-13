import { isElementVisible } from './element';
import { scrollIntoView } from './scroll-to';

export const refreshSelectedMenuItemPosition = (() => {
  let timer: NodeJS.Timeout;

  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const parent = document.querySelector<HTMLElement>('#menuScrollDom .o-scroller-container');
      const el = document.querySelector<HTMLElement>('#rec-active-menu-item > .o-sub-menu-title') || document.querySelector<HTMLElement>('#rec-active-menu-item');
      if (parent && el && !isElementVisible(el, parent, el.offsetHeight)) {
        scrollIntoView(el, parent, el.offsetHeight * 3);
      }
    }, 350);
  };
})();
