import { request } from '@/shared/axios';
import { getUserAuth } from '@opendesign-plus/composables';

/**
 * 获取消息中心未读消息数量
 */
export function getUnreadMsgCount() {
  const { csrfCookie } = getUserAuth();
  return request
    .get<{ count: Record<string, number> }>('/api-message/inner/count_new', {
      headers: { token: csrfCookie },
      showError: false,
    })
    .then((res) => res.data.count)
    .catch(() => ({}));
}
