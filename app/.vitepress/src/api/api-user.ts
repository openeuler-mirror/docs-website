import { request } from '@/shared/axios';
import { getUserAuth } from '@opendesign-plus/composables';

/**
 * 获取用户信息
 * @param community community字段，默认openeuler
 * @returns {Promise<ResponseT>} 用户信息
 */
export function queryUserInfo() {
  const { csrfCookie } = getUserAuth();
  const url = '/api-id/oneid/personal/center/user?community=openeuler';
  return request
    .get(url, {
      headers: {
        token: csrfCookie,
      },
      showError: false,
    })
    .then((res: AxiosResponse) => res.data);
}
