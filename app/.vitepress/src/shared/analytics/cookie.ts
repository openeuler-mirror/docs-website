import { COOKIE_KEY, disableHM, disableOA, enableHM, enableOA, isCookieAgreed } from './setup';

// 监听cookie set
if (typeof window !== 'undefined') {
  if (isCookieAgreed()) {
    enableOA();
  }
  const origDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;
  Object.defineProperty(Document.prototype, '_cookie', origDesc);
  Object.defineProperty(Document.prototype, 'cookie', {
    ...origDesc,
    get() {
      return this['_cookie'];
    },
    set(val: string) {
      try {
        const detail = val.split(';')[0].split('=');
        if (detail[0] === COOKIE_KEY) {
          if (detail[1] === '1') {
            enableOA();
            enableHM();
          } else {
            disableOA();
            disableHM();
          }
        }
      } finally {
        this['_cookie'] = val;
      }
    },
  });
}
