import type { Identity } from '@/@types/type-user';
import { defineStore } from 'pinia';

/**
 * 用户基本信息
 */
export const useUserInfoStore = defineStore('userInfo', {
  state: () => {
    return {
      identities: [] as Identity[],
      photo: '' as string,
      username: '' as string,
      upstreamPermission: null as boolean | null,
      // 协作平台admin权限
      platformAdminPermission: null as boolean | null,
      // 协作平台maintainer权限
      platformMaintainerPermission: null as boolean | null,
    };
  },
});
