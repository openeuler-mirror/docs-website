import { request } from '@/shared/axios';

/**
 * 检测页面是否存在
 * @param {string} path string
 * @return {boolean}
 */
export async function isPageExist(path: string) {
  try {
    await request.head(path, { showError: false });
    return true;
  } catch {
    return false;
  }
}