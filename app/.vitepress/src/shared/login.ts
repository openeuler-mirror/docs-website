import Cookies from 'js-cookie';
import { useUserInfoStore } from '@/stores/user';
import { queryUserInfo } from '@/api/api-user';
import { doLogout, doLogin, tryLogin } from '@opendesign-plus/composables';

const LOGIN_URL = import.meta.env.VITE_LOGIN_URL;
const XSRF_COOKIE_NAME = import.meta.env.VITE_XSRF_COOKIE_NAME;

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
export function logout(lang: string) {
  const url = `${LOGIN_URL}/logout?redirect_uri=${encodeURIComponent(location.href)}&lang=${lang}`;
  doLogout(url);
}

/**
 * 跳转登录页
 */
export function login(lang: string) {
  const url = `${LOGIN_URL}/login?redirect_uri=${encodeURIComponent(location.href)}&lang=${lang}`;
  doLogin(url);
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
export async function tryToLogin() {
  const userInfoStore = useUserInfoStore();
  const userInfo = await tryLogin(queryUserInfo as any);
  if (userInfo) {
    userInfoStore.$patch(userInfo);
  }
}
