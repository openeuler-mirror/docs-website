import type { UserInfoT } from '@/@types/type-user';
import { request } from '@/shared/axios';

interface UserPermissionResponseT {
  msg: string;
  code: number;
  data: UserInfoT;
}

/**
 * 获取用户信息
 * @param community community字段，默认openeuler
 * @returns {Promise<UserInfoT>} 用户信息
 */
export function queryUserInfo() {
  const url = '/api-id/oneid/personal/center/user?community=openeuler';
  return request.get<UserPermissionResponseT>(url, { showError: false }).then((res) => res.data.data);
}
