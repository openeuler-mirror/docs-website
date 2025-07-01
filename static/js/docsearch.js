/**
 * @file 搜索相关脚本
 */
$(async function ($) {
  var keyword = "";
  $(".baseof_mask").click(function (e) {
    $(".baseof_mask").css("display", "none");
    $(".alert").css("display", "none");
    $("#result-container").css("display", "none");
    $("#title-evaluate").removeClass("bug-hide");
  });

  $(".search-header>.icon-search").click(function (e) {
    keyword = $(".search-header>.search-text").val();
    $("#search_content").css("display", "block");
    searchMethods.search(keyword, 1, "#baseof-pagination");
  });

  $(".search-header>.search-text").bind("change", function (event) {
    keyword = $(".search-header>.search-text").val();
    $("#search_content").css("display", "block");
    searchMethods.search(keyword, 1, "#baseof-pagination");
  });

  $(document).ready(function () {
    $(".search-header>.search-text").blur(function () {
      var value = $(this).val();
      value = $.trim(value);
      if (value == "") {
        searchMethods.search(decodeURI(value), 1, "#baseof-pagination");
        $(".search-result>#baseof-pagination").css("display", "none");
      }
    });
  });

  $("#search-input>.icon-search").click(function (e) {
    keyword = $("#search-input>.search-text").val();
    $("#search_content").css("display", "block");
    searchMethods.search(decodeURI(keyword), 1, "#web-pagination");
  });

  $("#search-input>.search-text").bind("keyup", function (event) {
    if (!$("#search-input>.search-text").val()) {
      $("#search_content").css("display", "none");
    }
    if (event.keyCode == "13") {
      keyword = $("#search-input>.search-text").val();
      $("#search_content").css("display", "block");
      searchMethods.search(decodeURI(keyword), 1, "#web-pagination");
    }
  });

  $(".white_search").click(function (e) {
    $(".searcher").css("display", "block");
    $(".mask-mobile").css("display", "block");
    var height = $(".app-mobile").outerHeight(true) - 279;
    $(".mask-mobile").css("height", height);
  });
  $(".cancel-btn").click(function (e) {
    $(".searcher").css("display", "none");
    $(".mask-mobile").css("display", "none");
    var height = $(".app-mobile").outerHeight(true) - 279;
    $(".mask-mobile").css("height", height);
  });

  $(".mask-mobile").click(function (e) {
    $(".searcher").css("display", "none");
    $(".mask-mobile").css("display", "none");
    $(".app-mobile .h5_nav").removeClass("h5_nav_show");
  });

  $(".h5-search")
    .find(".search-btn")
    .click(function (e) {
      keyword = $(".h5-search").find("input").val();
      $(".search-result").css("display", "none");
      searchMethods.search(decodeURI(keyword), 1, "#pagination");
    });
  $(".h5-search input").keyup(function () {
    if ($(this).val() !== "") {
      $(".icon-clear").show();
    } else {
      $(".icon-clear").hide();
    }
  });
  $(".icon-clear").click(function () {
    $(".h5-search input").val("");
    $(".icon-clear").hide();
  });
  $(".h5-search>.search-text").bind("change", function (event) {
    keyword = $(".h5-search>.search-text").val();
    $(".search-result").css("display", "block");
    searchMethods.search(decodeURI(keyword), 1, "#pagination");
  });
  var versionText = "";
  var totalAmount = 0;
  var pagecount = 5;
  var currentScreen = document.body.clientWidth;
  if (currentScreen <= 1000) {
    pagecount = 3;
  }
  if (lang === "zh") {
    versionText = "版本";
    articles = "openeuler_articles";
  } else if (lang === "en") {
    versionText = "version";
    articles = "openeuler_articles_en";
  } else {
    versionText = "Версия";
    articles = "openeuler_articles_ru";
  }

  var searchMethods = {
    search: function (value, page, el) {
      const version = window.location.pathname.split("/")[3];
      let postData = {
        keyword: value,
        lang: lang,
        version,
        page: page,
      };
      import("./modules/analytics.js")
        .then(({ reportSearch }) => reportSearch(postData))
        .catch(() => {});
      $.ajax({
        type: "POST",
        url: "/api-search/search/sort/docs",
        data: JSON.stringify(postData),
        contentType: "application/json; charset=utf-8",
        datatype: "json",
        success: function (data) {
          let dataArr = data.obj?.records;
          totalAmount = data.obj?.count;
          if (page === 1) {
            $(".search-result>.title").find(".keyword").text(value);
            let pag = new Pagination({
              element: el || "#baseof-pagination",
              type: 1,
              pageIndex: 1,
              pageSize: 10,
              pageCount: pagecount,
              total: totalAmount,
              jumper: false,
              singlePageHide: false,
              prevText: "<",
              nextText: ">",
              disabled: false,
              currentChange: function (index) {
                searchMethods.search(decodeURI(keyword), index);
              },
            });
          }
          searchMethods.solveData(dataArr, versionText, el, value);
        },
        error: function (data) {
          totalAmount = 0;
          $(".search-result>.title").find(".keyword").text(value);
        },
      });
    },
    solveData: function (result, text, el, searchText) {
      $(".search-result>ul").empty();
      if (!result?.length) {
        $("#search_content").hide();
        if (el === "#pagination") {
          $(".search-result #pagination").hide();
          $(".search-result .no-data-mobile").show();
        } else {
          $(".search-result #baseof-pagination").hide();
          $(".search-result .no-data").show();
        }
        return;
      }
      $("#search_content").show();
      result.forEach(function (item, index) {
        let url = `/${item.path.replaceAll(" ", "-")}.html`;
        $(".search-result>ul").append(
          "<li>" +
            '<div class="res-title" href="' +
            url +
            '">' +
            searchMethods.escapeHTML(item.title) +
            "</div>" +
            '<div class="res-desc">' +
            searchMethods.escapeHTML(item.textContent) +
            "</div>" +
            '<div class="res-vers">' +
            searchMethods.escapeHTML(text) +
            '：<span class="which-version">' +
            searchMethods.escapeHTML(item.version) +
            "</span>" +
            "</div>" +
            "</li>"
        );

        $(".search-result>ul li")
          .find(".res-title")
          .click(function (e) {
            window.location.href = $(this).attr("href");
          });
      });
      if (el === "#pagination") {
        $(".search-result .no-data-mobile").hide();
        $(".search-result #pagination").show();
      } else {
        $(".search-result .no-data").hide();
        $(".search-result #baseof-pagination").show();
      }
    },
    escapeHTML: function (str) {
      return str.replace(/[&<>'"]/g, function (tag) {
        return (
          {
            "&": "&amp;",
            // '<': '&lt;',
            // '>': '&gt;',
            "'": "&#39;",
            '"': "&quot;",
          }[tag] || tag
        );
      });
    },
  };

  if (typeof keyword === "undefined") {
    $(".search-result").empty();
  } else {
    $(".search-result>.title").find(".keyword").text(decodeURI(keyword));
    $(".input>.search-text").val(decodeURI(keyword));
    $(".h5-search>div").find("input").val(decodeURI(keyword));
  }
});
