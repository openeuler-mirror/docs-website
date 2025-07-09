import Cookies from 'js-cookie';
import { useLangStore } from '@/stores/common';
import { useLoginStore, useUserInfoStore } from '@/stores/user';
import { queryUserInfo } from '@/api/api-user';
import { oa } from './analytics';

const LOGIN_URL = import.meta.env.VITE_LOGIN_URL;
const XSRF_COOKIE_NAME = import.meta.env.VITE_XSRF_COOKIE_NAME;

// 登录状态
export enum LOGIN_STATUS {
  FAILED = -1, // 登录失败
  NOT = 0, // 未登录
  DOING = 1, // 登录中
  DONE = 2, // 登录成功
}
export type LoginStatusT = typeof LOGIN_STATUS.FAILED | LOGIN_STATUS.NOT | LOGIN_STATUS.DOING | LOGIN_STATUS.DONE;

export const LOGIN_KEYS = {
  CSRF_TOKEN: XSRF_COOKIE_NAME,
  USER_INFO: '_U_I_',
};

/**
 * 从cookie中获取csrfToken
 * @returns csrfToken
 */
export const getCsrfToken = () => Cookies.get(LOGIN_KEYS.CSRF_TOKEN) || '';

// 退出登录
export function logout() {
  location.href = `${LOGIN_URL}/logout?redirect_uri=${encodeURIComponent(location.href)}`;
}

/**
 * 跳转登录页
 */
export function doLogin() {
  location.href = `${LOGIN_URL}/login?redirect_uri=${encodeURIComponent(location.href)}&lang=${useLangStore().lang}`;
}

// 清除用户认证凭据
export function clearUserAuth() {
  // 清除内存中用户信息
  useUserInfoStore().$reset();
  // 清除cookie
  if (import.meta.env.DEV) {
    Cookies.remove(LOGIN_KEYS.CSRF_TOKEN);
  } else {
    Cookies.remove(LOGIN_KEYS.CSRF_TOKEN, { domain: import.meta.env.VITE_COOKIE_DOMAIN, path: '/', secure: true });
  }
}

/**
 * 尝试登录
 * @returns 登录结果
 */
export async function tryLogin() {
  const userInfoStore = useUserInfoStore();
  const loginStore = useLoginStore();
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    userInfoStore.$reset();
    loginStore.setLoginStatus(LOGIN_STATUS.NOT);
    loginStore.setLoginStateChecked(true);
    return;
  }

  try {
    loginStore.setLoginStatus(LOGIN_STATUS.DOING);
    userInfoStore.$patch(await queryUserInfo());
    loginStore.setLoginStatus(LOGIN_STATUS.DONE);
    oa.setUserId(userInfoStore.username);
  } catch {
    loginStore.setLoginStatus(LOGIN_STATUS.FAILED);
  } finally {
    loginStore.setLoginStateChecked(true);
  }
}
