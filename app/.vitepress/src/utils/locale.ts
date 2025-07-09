import { isClient } from '@opensig/opendesign';

/**
 * 获取当前的语言环境，目前只支持 zh 和 en
 * @returns {string} 若当前是 zh 环境则返回 zh，否则返回 en
 */
export function getCurrentLocale() {
  if (isClient) {
    const { pathname } = window.location;
    if (pathname.startsWith('/zh/')) {
      return 'zh';
    } else if (pathname.startsWith('/en/')) {
      return 'en';
    } else {
      if (localStorage.getItem('locale')) {
        return localStorage.getItem('locale') === 'zh' ? 'zh' : 'en';
      } else {
        return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
      }
    }
  }

  return 'zh';
}
