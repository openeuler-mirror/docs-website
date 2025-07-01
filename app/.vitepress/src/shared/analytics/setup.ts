import { OpenAnalytics, OpenEventKeys, getClientInfo } from '@opensig/open-analytics';
import { type Awaitable } from 'vitepress';
import { removeCustomCookie } from '@/utils/cookie';
import { BAIDU_HM } from '@/config/data';

export const DEFAULT_SERVICE = 'docs';
export const COOKIE_KEY = 'agreed-cookiepolicy';
export const isCookieAgreed = () => document.cookie.match(/\bagreed-cookiepolicy=(.+?);?/)?.[1] === '1';

export const oa = new OpenAnalytics({
  appKey: 'openEuler',
  request: (data) => {
    if (!isCookieAgreed()) {
      disableOA();
      disableHM();
      return;
    }
    fetch('/api-dsapi/query/track/openeuler', { body: JSON.stringify(data), method: 'POST', headers: { 'Content-Type': 'application/json' } });
  },
});

export const enableOA = () => {
  oa.setHeader(getClientInfo());
  oa.enableReporting(true);
};

export const enableHM = () => {
  const hm = document.createElement('script');
  hm.src = BAIDU_HM;
  hm.classList.add('analytics-script');
  const s = document.getElementsByTagName('HEAD')[0];
  s.appendChild(hm);
};

export const disableOA = () => {
  oa.enableReporting(false);
  ['oa-openEuler-client', 'oa-openEuler-events', 'oa-openEuler-session'].forEach((key) => {
    localStorage.removeItem(key);
  });
};

export const disableHM = () => {
  const hm = /^hm/i;
  document.cookie
    .split(';')
    .map((c) => c.trim())
    .forEach((c) => {
      const key = decodeURIComponent(c.split('=')[0]);
      if (hm.test(key)) {
        removeCustomCookie(key);
      }
    });
};

export const reportPV = ($referrer?: string) => {
  oaReport(OpenEventKeys.PV, ($referrer && { $referrer }) || null);
};

export const reportPerformance = () => {
  oaReport(OpenEventKeys.LCP);
  oaReport(OpenEventKeys.INP);
  oaReport(OpenEventKeys.PageBasePerformance);
};

/**
 * @param event 事件名
 * @param eventData 上报数据
 * @param $service service字段取值
 * @param options options
 */
export function oaReport<T extends Record<string, any>>(
  event: string,
  eventData?: T | ((...opts: any[]) => Awaitable<T>) | null,
  $service = DEFAULT_SERVICE,
  options?: {
    immediate?: boolean;
    eventOptions?: any;
  }
) {
  if (!oa.enabled) {
    return;
  }
  return oa.report(
    event,
    async (...opt) => {
      return {
        $service,
        ...(typeof eventData === 'function' ? await eventData(...opt) : eventData),
      };
    },
    options
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'load',
    () => {
      reportPV();
      reportPerformance();
    },
    { once: true }
  );
}
