/**
 * @file 文档详情内容相关脚本
 */
$(function ($) {
  var urlArr = window.location.pathname.split("/");
  var isAdd1 = $("#markdown>ul").first().find("li").children().is("ul");
  var isAdd4 = $("#markdown>ul").first().find("li").children().is("p");
  var isAdd2 = $("#markdown>ul").first().find("li").children().is("a");
  var isAdd3 = $("#markdown>.table-of-contents").first().find("ul");
  var evaluateParams = {
    name: "",
    path: "",
    lang: "",
    version: "",
    stars: 0,
  };
  evaluateParams.lang = lang;
  var versionStr = urlArr[3].split("_");
  versionStr = versionStr.join(" ");
  var sourceLast = urlArr[6].replace("html", "md");
  var sourceHref =
    "https://gitee.com/openeuler/docs-centralized/tree/stable2-" +
    urlArr[3] +
    "/docs/" +
    lang +
    "/docs/" +
    urlArr[5] +
    "/" +
    sourceLast;
  $("#source").attr("href", sourceHref);
  $("#version-select .option li,#h5-menu-top .option a").each(function () {
    if ($(this).text() === versionStr) {
      $(this).addClass("active");
    }
  });
  if (evaluateParams.lang === "en") {
    $("#version-select>span,#h5-menu .h5-sersion").text(
      "Version: " + versionStr
    );
  } else if (evaluateParams.lang === "zh") {
    $("#version-select>span,#h5-menu .h5-sersion").text("版本: " + versionStr);
  } else {
    $("#version-select>span,#h5-menu .h5-sersion").text(
      "version: " + versionStr
    );
  }

  $("#version-select").click(function (e) {
    $("#version-option").toggleClass("show");
    $(this).children(".option").toggleClass("option-active");
    $(this).toggleClass("open-option");
    $(document).one("click", function () {
      $("#version-select .option").removeClass("option-active");
    });
    e.stopPropagation();
  });
  $(".h5_nav_left").click(function (e) {
    $("#app>.left").addClass("show-left");
    $(".h5-mask").show();
  });
  $("#h5-menu-top .icon-close,.h5-mask").click(function (e) {
    $("#app>.left").removeClass("show-left");
    $(".h5-mask").hide();
  });
  $("#h5-menu-top .h5-search")
    .find(".search-btn")
    .click(function (e) {
      keyword = $("#h5-menu-top .h5-search").find("input").val();
      window.location.href = "/" + lang + "/search.html?keyword=" + keyword;
    });
  if (isAdd1 && isAdd2 && !isAdd4) {
    let linkEle = $("#markdown>ul").first().clone();
    $("#title-evaluate>.title").append(linkEle);
  } else if (isAdd3) {
    $("#title-evaluate>.title").append(isAdd3);
  }
  $("#title-evaluate>.title")
    .find("li")
    .find("a")
    .click(function (e) {
      $("#title-evaluate>.title").find("li").find("a").removeClass("active");
      $(this).addClass("active");
    });
  getTreeLink();
});

function getTreeLink() {
  setTimeout(function () {
    let openEle = $(" #docstreeview .jstree-container-ul").find(".jstree-open");
    let lastBread = "";
    let h1 = $(".markdown h1");
    let title = "";
    if (h1.html()) {
      title = h1.html().trim();
    }
    const urlArr = window.location.pathname.split("/");
    const versionStr = urlArr[3].split("_").join(" ");
    let breadVersion = "";
    if (lang === "zh") {
      breadVersion = `<i></i><a href='/zh/docs${versionObjZh[versionStr].homePath}'>版本:${versionStr}</a>`;
    } else {
      breadVersion = `<i></i><a href='/en/docs${versionObjEn[versionStr].homePath}'>Version:${versionStr}</a>`;
    }
    $(".docs-a").append(breadVersion);
    let flag = false;
    if (openEle.length) {
      let span = "<i></i>";
      flag = true;
      $(".docs-a").append(span);
      for (let i = 0; i < openEle.length; i++) {
        if (i < openEle.length) {
          $(".docs-a")
            .append(
              $(" #docstreeview .jstree-container-ul")
                .find(".jstree-open")
                .eq(i)
                .find("a")
                .first()
                .clone()
            )
            .append(span);
          lastBread = $(" #docstreeview .jstree-container-ul")
            .find(".jstree-open")
            .eq(i)
            .find("a")
            .first()
            .text();
        }
      }
    }
    if (title !== lastBread) {
      const elementLastBread = flag
        ? `<a>${title}</a>`
        : `<i></i><a>${title}</a>`;
      $(".docs-a").append(elementLastBread);
    } else {
      $(".docs-a i:nth-last-of-type(1)").remove();
    }
    if (!$(".docs-a>a:nth-last-of-type(1)").html()) {
      $(".docs-a>a:nth-last-of-type(1)").remove();
    }
  }, 100);
}
