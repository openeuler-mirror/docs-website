import { request } from '@/shared/axios';

/**
 * 获取消息中心未读消息数量
 */
export function getUnreadMsgCount() {
  return request
    .get<{ count: Record<string, number> }>('/api-message/inner/count_new', {
      showError: false,
    })
    .then((res) => res.data.count);
}
