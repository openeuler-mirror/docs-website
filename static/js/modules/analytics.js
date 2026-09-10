import {
  OpenAnalytics,
  OpenEventKeys,
  getClientInfo,
} from "https://unpkg.com/@opensig/open-analytics@0.0.9/dist/open-analytics.mjs";

const COOKIE_AGREED_STATUS = {
  NOT_SIGNED: "0", // 未签署
  ALL_AGREED: "1", // 同意所有cookie
  NECCESSARY_AGREED: "2", // 仅同意必要cookie
  BROWSE_AGREED: "3", // 中文页继续浏览视为同意
};

const COOKIE_KEY = `agreed-cookiepolicy-${
  window.location.pathname.includes("/en/") ? "en" : "zh"
}`;

const getUserCookieStatus = () => {
  if (window.location.pathname.startsWith('/zh')) {
    return COOKIE_AGREED_STATUS.ALL_AGREED;
  }
  const cookieVal = document.cookie.match(
    new RegExp(`${COOKIE_KEY}=([^;]+);?`)
  )?.[1];
  const cookieStatusVal = cookieVal?.[0];
  if (
    cookieStatusVal === COOKIE_AGREED_STATUS.ALL_AGREED ||
    cookieStatusVal === COOKIE_AGREED_STATUS.BROWSE_AGREED
  ) {
    return COOKIE_AGREED_STATUS.ALL_AGREED;
  } else if (cookieStatusVal === COOKIE_AGREED_STATUS.NECCESSARY_AGREED) {
    return COOKIE_AGREED_STATUS.NECCESSARY_AGREED;
  } else {
    return COOKIE_AGREED_STATUS.NOT_SIGNED;
  }
};

const oa = new OpenAnalytics({
  appKey: "openEuler",
  request: (data) => {
    if (getUserCookieStatus() !== COOKIE_AGREED_STATUS.ALL_AGREED) {
      disableOA();
      [
        "oa-openEuler-events",
        "oa-openEuler-client",
        "oa-openEuler-session",
      ].forEach((key) => localStorage.removeItem(key));
      return;
    }
    fetch("/api-dsapi/query/track/openeuler", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(data),
    }).catch(() => ({}));
  },
});

let reportPerfCount = 0;

export const enableOA = () => {
  oa.setHeader(getClientInfo());
  oa.enableReporting(true);
  if (reportPerfCount >= 1) {
    return;
  }
  reportPerfCount++;
  reportPerformance();
};

export const disableOA = () => {
  oa.enableReporting(false);
};

export const reportPV = () => {
  oaReport(OpenEventKeys.PV);
};

export const reportSearch = (data) => {
  oaReport("input", data, "search_docs");
};

export const reportPerformance = () => {
  oaReport(OpenEventKeys.LCP);
  oaReport(OpenEventKeys.INP);
  oaReport(OpenEventKeys.PageBasePerformance);
};

/**
 * @param {string} event 事件名
 * @param {Object | undefined} eventData 上报数据
 * @param {string | undefined} $service service字段取值
 * @param {Object} options options
 */
export const oaReport = (event, eventData, $service = "docs", options) => {
  if (!oa.enabled) {
    return;
  }
  return oa.report(
    event,
    async (...opt) => ({
      $service,
      ...(typeof eventData === "function"
        ? await eventData(...opt)
        : eventData),
    }),
    options
  );
};
