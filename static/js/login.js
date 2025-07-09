/**
 * @file 账号登录
 */
const LOGIN_INFO = {
  photo: "",
  username: "",
  token: "token",
};

var loginProxy = new Proxy(LOGIN_INFO, {
  get: function (target, key) {
    return target[key] || "";
  },
  set: function (target, key, value) {
    if (key === "token") {
      if (value) {
        $("#opt_user .logined").show();
        $("#opt_user .login").hide();
      } else {
        $("#opt_user .logined").hide();
        $("#opt_user .login").show();
      }
    }
    if (key === "photo") {
      if (value) {
        $("#opt_user .logined .img").show();
        $("#opt_user .logined .empty-img").hide();
      } else {
        $("#opt_user .logined .img").hide();
        $("#opt_user .logined .empty-img").show();
      }
      $("#opt_user .img")[0].src = value;
      $("#opt_user .img")[1].src = value;
    }
    if (key === "username") {
      $("#opt_user .opt-name").text(value);
      $("#opt_user .opt-name")[0].title = value;
      $("#opt_user .opt-name")[1].title = value;
    }
    return (target[key] = value || "");
  },
});

// 登录相关接口
var LoginQuery = {
  queryCourse: (params, token) => {
    return new Promise((resolve, reject) => {
      $.ajax({
        type: "get",
        url: "/omapi/oneid/user/permission",
        data: params,
        contentType: "application/json; charset=utf-8",
        datatype: "json",
        headers: {
          token,
        },
        success(result) {
          if (result) {
            resolve(result);
            return;
          }
          reject(result);
        },
        error(msg) {
          reject(msg);
        },
      });
    });
  },
};

var Login = {
  LOGIN_KEYS: {
    USER_TOKEN: "_U_T_",
    USER_INFO: "_U_I_",
  },

  targetOrigin: "https://id.openeuler.org",

  setCookie(cname, cvalue, isDelete) {
    const deleteStr = isDelete ? "max-age=0; " : "";
    const domain = ".openeuler.org";
    const expires = `${deleteStr}path=/; domain=${domain}`;
    document.cookie = `${cname}=${cvalue}; ${expires}`;
  },

  getCookie(cname) {
    const name = `${cname}=`;
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      const c = ca[i].trim();
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  },

  deleteCookie(cname) {
    this.setCookie(cname, "null", true);
  },

  saveUserAuth(code = "") {
    if (!code) {
      this.deleteCookie(this.LOGIN_KEYS.USER_TOKEN);
    } else {
      this.setCookie(this.LOGIN_KEYS.USER_TOKEN, code, false);
    }
  },

  getUserAuth() {
    const token = this.getCookie(this.LOGIN_KEYS.USER_TOKEN) || "";
    if (!token) {
      this.saveUserAuth();
    }
    return {
      token,
    };
  },

  // 退出登录
  logout() {
    location.href = `${this.targetOrigin}/logout?redirect_uri=${location.href}`;
  },

  // 刷新页面
  refreshPage() {
    window.location.reload();
  },

  showGuard() {
    const { lang } = this.getLanguage();
    location.href = `${this.targetOrigin}/login?redirect_uri=${location.href}&lang=${lang}`;
  },

  setLogInfo(data, token = "") {
    const { photo = "", username = "" } = data;
    loginProxy.photo = photo;
    loginProxy.username = username;
    loginProxy.token = token;
  },

  // token失效
  tokenFailIndicateLogin() {
    this.setLogInfo({});
    this.saveUserAuth();
    this.removeSessionInfo();
  },

  setSessionInfo(data) {
    const { username, photo } = data || {};
    if (username && photo) {
      sessionStorage.setItem(
        this.LOGIN_KEYS.USER_INFO,
        JSON.stringify({ username, photo })
      );
    }
  },
  getSessionInfo() {
    let username = "";
    let photo = "";
    try {
      const info = sessionStorage.getItem(this.LOGIN_KEYS.USER_INFO);
      if (info) {
        const obj = JSON.parse(info) || {};
        username = obj.username || "";
        photo = obj.photo || "";
      }
    } catch (error) {}
    return {
      username,
      photo,
    };
  },
  removeSessionInfo() {
    sessionStorage.removeItem(this.LOGIN_KEYS.USER_INFO);
  },

  // 刷新后重新请求登录用户信息
  refreshInfo(community = "openeuler") {
    const { token } = this.getUserAuth();
    if (token) {
      this.setLogInfo(this.getSessionInfo(), token);
      LoginQuery.queryCourse({ community }, token)
        .then((res) => {
          const { data } = res;
          if (Object.prototype.toString.call(data) === "[object Object]") {
            this.setLogInfo(data, token);
            this.setSessionInfo(data);
          }
        })
        .catch(() => {
          this.tokenFailIndicateLogin();
        });
    } else {
      this.setLogInfo({}, token);
      this.removeSessionInfo();
    }
  },
  getLanguage() {
    if (location.pathname.includes("/zh/")) {
      return {
        lang: "zh",
        language: "zh-CN",
      };
    }
    return {
      lang: "en",
      language: "en-US",
    };
  },
};

$(function ($) {
  $(document).ready(function () {
    if (location.pathname.includes("/ru/")) {
      $(".opt-user").remove();
    }
  });
  Login.refreshInfo();
  $("#opt_user>.login").click(function (e) {
    Login.showGuard();
  });
  $("#opt_user .logout").click(function (e) {
    Login.logout();
  });
  $("#opt_user .zone").click(function (e) {
    window.open(
      `${Login.targetOrigin}/${Login.getLanguage().lang}/profile`,
      "_blank"
    );
  });
});
