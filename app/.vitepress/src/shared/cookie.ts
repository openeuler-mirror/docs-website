import Cookies from 'js-cookie';

/**
 * 获取指定key的cookie值
 * @param key
 * @returns
 */
export const getCustomCookie = (key: string) => {
  return Cookies.get(key);
};

/**
 * 设置cookie
 * @param key cookie的key
 * @param value cookie的值
 * @param day cookie的过期时间 默认180天
 * @param domain domain地址
 */
export const setCustomCookie = (key: string, value: string, day = 180, domain: string = location.hostname) => {
  Cookies.set(key, value, { expires: day, path: '/', domain: domain });
};

/**
 * 删除cookie
 * @param key cookie的key
 * @param domain domain地址
 */
export const removeCustomCookie = (key: string, domain: string = location.hostname) => {
  Cookies.remove(key, { path: '/', domain: domain });
};
