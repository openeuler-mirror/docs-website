import { oa, reportPV } from './setup'

if (typeof window !== 'undefined') {
  let referrer: string;

  ['replaceState', 'pushState'].forEach((method) => {
    const native = History.prototype[method as 'replaceState' | 'pushState'];
    History.prototype[method as 'replaceState' | 'pushState'] = function (data: any, unused: string, url?: string | URL | null) {
      try {
        if (oa.enabled) {
          const beforePath = location.pathname;
          native.call(this, data, unused, url);
          const afterPath = location.pathname;
          if (beforePath !== afterPath) {
            reportPV(referrer);
          }
        } else {
          native.call(this, data, unused, url);
        }
      } catch {
        native.call(this, data, unused, url);
      } finally {
        referrer = location.href;
      }
    };
  });

  window.addEventListener('popstate', () => {
    const prevPath = new URL(referrer).pathname;
    if (prevPath !== location.pathname) {
      reportPV(referrer);
    }
    referrer = location.href;
  });
}
