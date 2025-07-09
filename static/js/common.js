/**
 * @file 文档详情及首页通用相关脚本
 */
$(function ($) {
  $(document).ready(function () {
    const lang = location.href.split("/")[3];
    $(
      "#h5-menu .h5-next i,#h5-menu .h5-prev i"
    ).html(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 32 32">
<title>arrow-right</title>
<path fill="currentColor"  d="M2.667 16.667v-1.333c0-0.368 0.298-0.667 0.667-0.667h21.56l-5.933-5.92c-0.126-0.125-0.197-0.296-0.197-0.473s0.071-0.348 0.197-0.473l0.947-0.933c0.125-0.126 0.296-0.197 0.473-0.197s0.348 0.071 0.473 0.197l8.187 8.173c0.188 0.187 0.293 0.442 0.293 0.707v0.507c-0.003 0.265-0.108 0.518-0.293 0.707l-8.187 8.173c-0.125 0.126-0.296 0.197-0.473 0.197s-0.348-0.071-0.473-0.197l-0.947-0.947c-0.125-0.123-0.196-0.291-0.196-0.467s0.071-0.344 0.196-0.467l5.933-5.92h-21.56c-0.368 0-0.667-0.298-0.667-0.667z"></path>
</svg>
`);
    $(
      ".pc-prev .icon-prev,.pc-next .icon-next"
    ).html(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32">
<title>arrow-right</title>
<path fill="currentColor"  d="M2.667 16.667v-1.333c0-0.368 0.298-0.667 0.667-0.667h21.56l-5.933-5.92c-0.126-0.125-0.197-0.296-0.197-0.473s0.071-0.348 0.197-0.473l0.947-0.933c0.125-0.126 0.296-0.197 0.473-0.197s0.348 0.071 0.473 0.197l8.187 8.173c0.188 0.187 0.293 0.442 0.293 0.707v0.507c-0.003 0.265-0.108 0.518-0.293 0.707l-8.187 8.173c-0.125 0.126-0.296 0.197-0.473 0.197s-0.348-0.071-0.473-0.197l-0.947-0.947c-0.125-0.123-0.196-0.291-0.196-0.467s0.071-0.344 0.196-0.467l5.933-5.92h-21.56c-0.368 0-0.667-0.298-0.667-0.667z"></path>
</svg>
`);
    // 根据目前语言激活语言切换相应颜色
    $(function ($) {
      if (lang === "zh") {
        $(`a[href='/zh/']`).addClass("active");
      } else if (lang === "en") {
        $(`a[href='/en/']`).addClass("active");
      } else {
        $(`a[href='/ru/']`).addClass("active");
      }
    });
    // 生成当前页的二级目录导航
    $(function ($) {
      let titleList;
      if ($("#markdown h2").length) {
        titleList = $("#markdown h2");
      } else if ($(".doc-map-main h2").length) {
        titleList = $(".doc-map-main h2");
      } else {
        return;
      }
      let tocList = "";
      let tempList = [];
      let tempList2 = [];
      Object.keys(titleList).forEach((key) => {
        if (titleList[key].id) {
          if (!tempList.includes(titleList[key].id)) {
            tempList.push(titleList[key].id);
            tempList2.push(titleList[key]);
          }
        }
      });
      Object.keys(tempList2).forEach((key, index) => {
        if (parseInt(key) === key * 1) {
          tocList =
            tocList +
            `<li><a href="#${tempList2[index].id}">${tempList2[key].textContent}</a></li>`;
        }
      });
      $("#toc-list").append(tocList);
      let targetUrlArr = [];
      let targetUrl = [];
      $(".book-toc #toc-list a[href]").each(function () {
        targetUrlArr.push($($(this).attr("href")));
      });
      targetUrl = targetUrlArr.filter(function (item) {
        return $(window).scrollTop() + 160 > item.offset().top;
      });
      if (targetUrl.length) {
        $(".book-toc #toc-list a[href]").removeClass("active");
        $(
          "a[href='#" + targetUrl[targetUrl.length - 1].attr("id") + "']"
        ).addClass("active");
      } else if ($(".book-toc #toc-list a[href]").length) {
        $(".book-toc #toc-list a[href]").removeClass("active");
        $(".book-toc #toc-list a[href]").eq(0).addClass("active");
      }
    });
    // 根据滚动激活导航状态
    function handleScrollEvent(element) {
      $(element).scroll(function () {
        const targetUrlArr = [];
        $(".book-toc #toc-list li a[href]").each(function () {
          targetUrlArr.push($($(this).attr("href")));
        });
        targetUrl = targetUrlArr.filter(function (item) {
          if (element === "#right") {
            if ($(element).scrollTop() < 61) {
              return $(element).scrollTop() > item.offset().top;
            } else {
              return $(element).scrollTop() - 200 > item.offset().top;
            }
          } else {
            return $(element).scrollTop() + 60 > item.offset().top;
          }
        });
        if (targetUrl.length) {
          $(".book-toc #toc-list a[href]").removeClass("active");
          $(".book-toc #toc-list a[href]")
            .eq(targetUrl.length - 1)
            .addClass("active");
        }
      });
    }
    handleScrollEvent(window);
    handleScrollEvent("#right");
    // 获取 cookie
    function getCustomCookie(key) {
      const name = `${encodeURIComponent(key)}=`;
      const decodedCookies = decodeURIComponent(document.cookie);
      const cookies = decodedCookies.split('; ');
      for (let cookie of cookies) {
        if (cookie.startsWith(name)) {
          return cookie.substring(name.length);
        }
      }

      return null;
    }
    // 设置 cookie
    function setCustomCookie(key, value, day = 1, domain = location.hostname) {
      const expires = new Date();
      expires.setTime(expires.getTime() + day * 24 * 60 * 60 * 1000);
      const cookie = `${encodeURIComponent(key)}=${encodeURIComponent(
        value
      )}; expires=${expires.toUTCString()}; path=/; domain=${domain}`;
      document.cookie = cookie;
    }
    // 换肤
    (function () {
      const domain = '.openeuler.org';
      const APPEARANCE_KEY = 'openEuler-theme-appearance';
      const themeStyle = getCustomCookie(APPEARANCE_KEY);
      const _body = $('html');
      if (!themeStyle) {
        $('.theme-change i').removeClass('light dark').addClass('light');
        $('.nav-menu a .h5-logo').removeClass('dark');
        _body.removeClass('light dark').addClass('light');
      } else {
        $('.theme-change i').removeClass('light dark').addClass(themeStyle);
        $('.nav-menu a .h5-logo').addClass(themeStyle);
        _body.removeClass('light dark').addClass(themeStyle);
      }
      $('.theme-change i').click(function () {
        if ($(this).hasClass('light')) {
          $('.nav-menu a .h5-logo').addClass('dark');
          $(this).addClass('dark').removeClass('light');
          setCustomCookie(APPEARANCE_KEY, 'dark', 180, domain);
          _body.addClass('dark').removeClass('light');
        } else {
          $('.nav-menu a .h5-logo').removeClass('dark');
          $(this).addClass('light').removeClass('dark');
          setCustomCookie(APPEARANCE_KEY, 'light', 180, domain);
          _body.addClass('light').removeClass('dark');
        }
      });
    })();
    // 点击logo回到文档首页
    $("#h5-menu-top .h5-logo .logo-img,.nav-box .h5-logo,.pc-logo").click(
      () => {
        window.open(`/${lang}/`, "_self");
      }
    );
    // 点击版本出现版本选择
    $(".app-mobile .h5_nav .icon-servision").click(function () {
      $(this).toggleClass("open");
      $(".app-mobile .h5_nav .option").toggleClass("option-show");
    });
    // 控制移动端菜单栏的显示
    $(".app-mobile .h5_nav_left").click(function () {
      $(".app-mobile .h5_nav").addClass("h5_nav_show");
      $(".mask-mobile").css("display", "block");
      $(".mask-mobile").css("height", "100vh");
      $(".mask-mobile").css("position", "fixed");
    });
    $(".app-mobile .icon-close").click(function () {
      $(".app-mobile .h5_nav").removeClass("h5_nav_show");
      $(".mask-mobile").css("display", "none");
    });
    // 根据语言控制版本选择的显示
    $("#h5-menu-top .option").addClass(`option-${lang}`);
    // 尾部点击跳转
    // 首页卡片点击事件
    $("#document_content>div,.h5_content .hot_documentation>div").click(
      function () {
        window.open($(this).attr("href"), "_blank");
      }
    );
    // 给较长的导航栏文字增加title start
    function addNavTitle() {
      $(".jstree-anchor").mouseenter(function () {
        if ($(this)[0].scrollWidth > $(this)[0].offsetWidth) {
          $(this).attr("title", $(this).text());
        }
      });
    }
    addNavTitle();
    // 观察导航栏节点是否发生变化
    if ($(".jstree-anchor").length) {
      const mutation = new MutationObserver(addNavTitle);
      const config = { childList: true, subtree: true };
      const targetNode = document.getElementById("docstreeview");
      mutation.observe(targetNode, config);
    }
    // 给较长的导航栏文字增加title end
    // 控制左侧导航栏滚动
    $(document).ready(function () {
      const firstNavElement = $("#docstreeview>ul>li:nth-of-type(1)");
      const checkedElement = $(".jstree-clicked");
      if (firstNavElement.length && checkedElement.length) {
        const firstNavTop = firstNavElement.offset().top;
        const checkedTop = checkedElement.offset().top;
        $("#docstreeview")
          .stop()
          .animate(
            {
              scrollTop: checkedTop - firstNavTop,
            },
            100
          );
      }
    });
    // 根据目前语言激活语言切换相应颜色
    $(function ($) {
      $(".long-time .long-title").click(function () {
        $(".long-time .long-title .icon-down").toggleClass("show");
        $(".long-time .version-list").toggleClass("show");
      });
      $(".innovate .innovate-title").click(function () {
        $(".innovate .innovate-title .icon-down").toggleClass("show");
        $(".innovate .version-list").toggleClass("show");
      });
      $(".archive .archive-title").click(function () {
        $(".archive .archive-title .icon-down").toggleClass("show");
        $(".archive .version-list").toggleClass("show");
      });
    });
    // 点击面包屑的回到文档首页
    $(".nav-box .docs-a .home-bread,.h5-docs-a .home-bread").click(() => {
      window.open(`/${lang}/`, "_self");
    });
  });
});
