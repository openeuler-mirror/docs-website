import { isClient } from '@opensig/opendesign';
import type { DocMenuNodeT } from './tree';

/**
 * safe window open
 */
export const windowOpen = (url?: string | URL | undefined, target?: string | undefined, features?: string | undefined) => {
  const opener = window.open(url, target, features);
  if (opener) {
    opener.opener = null;
  }
};

/**
 * 时间戳转 xxxx/xx/xx 格式时间
 * @param {number} timestamp 待转换时间戳
 * @returns {string} 返回格式化时间，如 2024/01/01
 */
export const changeTimeStamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);

  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);

  return `${year}/${month}/${day}`;
};

/**
 * URL参数转对象
 * @param {string} url 地址
 * @returns {(string|undefined)} 转换成功返回参数对象，失败返回 undefined
 */
export function getUrlParams(url: string) {
  const arrObj = url.split('?');
  if (arrObj.length > 1) {
    const arrPara = arrObj[1].split('&');
    const list = {} as any;
    for (let i = 0; i < arrPara.length; i++) {
      const item = arrPara[i].split('=');
      const key = item[0];
      const value = item[1];
      list[key] = value;
    }
    return list;
  }
}

/**
 * 滚动至顶部
 * @param {number} top 滑动到的顶部
 * @param {boolean} smooth 是否平滑滑动
 */
export const scrollToTop = (top: number = 0, smooth: boolean = true) => {
  if (isClient) {
    const dom = document.querySelector('#app > .o-scroller > .o-scroller-container');
    dom?.scrollTo({
      top,
      behavior: smooth ? 'smooth' : 'instant',
    });
  }
};

/**
 * 获取url搜索参数
 * @param {string} url 完整 url
 * @returns {Object} url 中的搜索参数
 */
export function getSearchUrlParams(url: string) {
  const search = new URL(url).search;
  const params = new URLSearchParams(search);
  return params;
}

/**
 * 判断 key 是否存在于目标对象上
 * @param {(string|number|symbol)} key 待判断 key
 * @param {object} obj 目标对象
 * @returns {boolean} 存在返回 true，不存在返回 false
 */
export const isValidKey = (key: string | number | symbol, obj: object): key is keyof typeof obj => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

/**
 * 获取指定时区偏移量的年份
 * @param {number} offset - 时区偏移量（单位：小时）。例如，UTC+8 时区，传入 8。
 * @returns {number} - 指定时区偏移量对应的年份
 */
export function getYearByOffset(offset = 8) {
  // 获取当前时间的 UTC 时间
  const now = new Date();
  const utcTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

  // 设置偏移
  utcTime.setHours(utcTime.getHours() + offset);

  return utcTime.getFullYear();
}

/**
 * 获取gitee源地址
 */
export function getGiteeUrl(node: DocMenuNodeT | null) {
  // 为空返回空字符串
  if (!node) {
    return '';
  }

  // 页面内容来源为 sig 仓库
  if (node.upstream) {
    return node.upstream;
  }

  // 页面内容来源为文档仓
  let pathname = window.location.pathname;
  if (pathname.endsWith('.html')) {
    pathname = pathname.replace('.html', '.md');
  } else if (pathname.endsWith('/')) {
    pathname = `${pathname}index.md`;
  } else {
    pathname = `${pathname}.md`;
  }

  const [_, lang, __, branch, ...others] = pathname.split('/');
  const map: Record<string, string> = {
    common: 'stable-common',
    '25.03': 'stable-25.03',
    '24.03_LTS_SP1': 'stable-24.03_LTS_SP1',
    '24.03_LTS_SP2': 'stable-24.03_LTS_SP2',
  };

  return `https://gitee.com/openeuler/docs/blob/${map[branch]}/docs/${lang}/${others.join('/')}`;
}

/**
 * 从url中获取版本
 * @param {string} url url
 * @returns {string} 版本
 */
export function getVersionFromUrl(url: string) {
  const arr = url.split('/');
  return arr[url.startsWith('/') ? 3 : 2] || '';
}

/**
 * 获取转义后的dom id
 */
export function getDomId(str: string) {
  return str.replace(/[ &]/g, '-');
}
