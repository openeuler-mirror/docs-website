/**
 * @file 文档右下角浮窗相关脚本
 */
$(document).ready(() => {
  if (window.innerWidth > 1100) {
    $(".app-mobile .float-mobile").remove();
    $(".o-popup1 .submit-btn-mb").remove();
  } else {
    $("#app.web .float-wrap").remove();
  }
  function toggleIsShow(toggle) {
    if (toggle) {
      $(".float-wrap .nav-box1 .item-nav .o-popup1").addClass("active");
    } else {
      $(".float-wrap .nav-box1 .item-nav .o-popup1").removeClass("active");
    }
  }
  $(".float-wrap .nav-box1 .item-nav.popup1").mouseenter(function () {
    toggleIsShow(true);
  });
  $(".float-wrap .nav-box1 .item-nav.popup1").mouseleave(function () {
    toggleIsShow(false);
  });
  $(".float-wrap .nav-box1 .item-nav.popup1 .icon-box").mouseleave(function () {
    setInit();
    $(".float-wrap .nav-box1 .item-nav .o-popup1").removeClass("show");
  });

  const sliderTrack = $(".slider-body");
  const sliderHandle = $("#sliderHandle");
  const step = 10; // 调整这个值以设置步长大小

  const PLACEHOLDER1 = "请输入您不太满意的原因";
  const PLACEHOLDER2 = "改进哪些方面会让您更满意？";
  const PLACEHOLDER3 = "请输入您满意的原因";
  $("#textarea-input").attr("placeholder", PLACEHOLDER1);
  let score = 0;
  let mark = '<div class="mark-item"></div>';
  for (let i = 0; i < step; i++) {
    mark += '<div class="mark-item"></div>';
  }
  $(".slider-track .mark .item-box,.slider-track .pre-mark").append(mark);
  function handleMouseMove(e) {
    const trackWidth = sliderTrack.width();
    $(".slider-track .mark .item-box").css("width", `${trackWidth}px`);
    const initialX = sliderTrack.offset().left;
    let newLeft = e.clientX - initialX;
    const stepSize = trackWidth / step;
    newLeft = Math.max(0, Math.min(trackWidth, newLeft));
    newLeft = Math.round(newLeft / stepSize) * stepSize;
    score = Math.ceil(newLeft / stepSize);
    sliderHandle.css("left", `${newLeft}px`);
    $(".mark").css("width", `${newLeft}px`);
    $(".slider-body .slider-tip").css("left", `${newLeft}px`);
    $(".slider-body .slider-tip").text(score);
    $(".o-popup1 .reason").show();
    $(".o-popup1 .submit-btn-mb .confirm-btn").removeClass("forbidden");
    $(".o-popup1 .slider-tip").show();
    $(".o-popup1").addClass("show");
    $("#textarea-input").placeholder = PLACEHOLDER1;
    isResonShow = true;
    if (score < 7) {
      $("#textarea-input").attr("placeholder", PLACEHOLDER1);
    } else if (score < 9) {
      $("#textarea-input").attr("placeholder", PLACEHOLDER2);
    } else {
      $("#textarea-input").attr("placeholder", PLACEHOLDER3);
    }
    $(`.tip-item`).removeClass("active");
    $(`.tip-item:eq(${score})`).addClass("active");
  }
  function setInit() {
    score = 0;
    inputText = "";
    sliderHandle.css("left", `${0}px`);
    $(".mark").css("width", `${0}px`);
    $(".slider-body .slider-tip").css("left", `${0}px`);
    $(".slider-body .slider-tip").text(score);
    $(".o-popup1 .reason").hide();
    $(".o-popup1 .submit-btn-mb .confirm-btn").addClass("forbidden");
    $(".o-popup1 .slider-tip").hide();
    $("#textarea-input").placeholder = PLACEHOLDER1;
    $("#textarea-input").val(inputText);
    $("#textarea-input+p span").html(inputText.length);
    $(".o-popup1").removeClass("show");
    $(".float-mobile .float-content").hide();
  }
  sliderTrack.on("mousedown", function () {
    sliderTrack.on("mousemove", handleMouseMove);
  });

  $(document).on("mouseup", function () {
    sliderTrack.off("mousemove", handleMouseMove);
  });
  sliderTrack.mouseleave(function () {
    sliderTrack.off("mousemove", handleMouseMove);
  });
  // 初始绑定一次mousemove事件
  sliderTrack.on("mousedown", handleMouseMove);
  // 点击回到顶部
  $(".float-wrap .nav-box2").on("click", function () {
    $("#right").scrollTop(0);
    $(window).scrollTop(0);
  });

  // 输入事件相关
  let inputText = "";
  $("#textarea-input").on("input", function (event) {
    inputText = event.target.value;
    $("#textarea-input+p span").html(inputText.length);
  });
  $("#textarea-input").on("focus", function () {
    $(".float-wrap .input-area").addClass("is-focus");
  });
  $("#textarea-input").on("blur", function () {
    $(".float-wrap .input-area").removeClass("is-focus");
  });
  // 点击关闭
  $(".o-popup1 .icon-cancel").on("click", function () {
    setInit();
    toggleIsShow(false);
  });

  // 点击提交
  // 处理提示语 type:success 提交成功 error 提交失败
  function handleTip(type, tip = "") {
    if (type === "success") {
      $("#float-tip").removeClass("error-tip");
      $("#float-tip").addClass("success-tip");
      $("#float-tip .tip-text").text("提交成功，感谢您的反馈！");
    } else {
      $("#float-tip").removeClass("success-tip");
      $("#float-tip").addClass("error-tip");
      $("#float-tip .tip-text").text(tip ? tip : "Error !");
    }
    $("#float-tip").addClass("show");
    setTimeout(() => {
      $("#float-tip").removeClass("show");
    }, 2000);
  }
  function postScore() {
    const postData = {
      feedbackPageUrl: location.href,
      feedbackText: inputText,
      feedbackValue: score,
    };
    $.ajax({
      type: "POST",
      url: "/api-dsapi/query/nps?community=openeuler",
      data: JSON.stringify(postData),
      contentType: "application/json; charset=utf-8",
      datatype: "json",
      success: function (data) {
        const res = JSON.parse(data);
        if (res.code === 200) {
          handleTip("success");
          const submitTime = new Date().valueOf();
          if (window.innerWidth < 1100) {
            localStorage.setItem(
              "submit-time-mobile",
              JSON.stringify(submitTime)
            );
          } else {
            localStorage.setItem("submit-time", JSON.stringify(submitTime));
          }
          $(".app-mobile .float-mobile").remove();
        } else {
          handleTip("error", res.msg);
        }
        setInit();
      },
      error: function () {
        handleTip("error");
        setInit();
      },
    });
  }
  $(".o-popup1 .submit-btn .o-button").on("click", function () {
    const lastSubmitTime = localStorage.getItem("submit-time");
    const intervalTime = 1 * 12 * 60 * 60 * 1000;
    const nowTime = new Date().valueOf();
    if (lastSubmitTime) {
      const flag = nowTime - JSON.parse(lastSubmitTime) > intervalTime;
      if (flag) {
        postScore();
      } else {
        handleTip("error", "请不要频繁提交！");
      }
    } else {
      postScore();
    }
  });
  // 浮窗移动端
  (function () {
    let tip = "";
    for (let i = 0; i < 11; i++) {
      tip =
        tip +
        `<div class="tip-item" style="left:${i * 10}%
      ">${i}</div>`;
    }
    $(".o-popup1 .slider .slider-body .slider-tip-mb").append(tip);
    // 点击浮窗
    $(".float-mobile .float-head .head-title").on("click", function () {
      $(".float-content").show();
    });
    // 点击遮罩
    $(".float-mobile .float-content .float-mask").on("click", function () {
      $(".float-content").hide();
    });
    // 点击取消
    $(".float-mobile .float-content .o-popup1 .submit-btn-mb .cancel-btn").on(
      "click",
      function () {
        $(".float-content").hide();
        setInit();
      }
    );
    // 移动端点击确定提交
    $(".float-mobile .float-content .o-popup1 .submit-btn-mb .confirm-btn").on(
      "click",
      function () {
        if (!$(this).hasClass("forbidden")) {
          postScore();
        }
      }
    );
    // 点击关闭移动端评分入口
    $(".float-mobile .float-head .icon-cancel").on("click", function () {
      $(".app-mobile .float-mobile").remove();
      const closeTime = new Date().valueOf();
      localStorage.setItem("close-float-time", JSON.stringify(closeTime));
    });
    // 移动端用户关闭后7天不展示,提交后30日内不出现入口
    (function () {
      const lastCloseTime = localStorage.getItem("close-float-time");
      const lastSubmitTime = localStorage.getItem("submit-time-mobile");
      const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000;
      const thirtyInMilliseconds = 30 * 24 * 60 * 60 * 1000;
      const nowTime = new Date().valueOf();
      if (lastCloseTime || lastSubmitTime) {
        let flag1;
        let flag2;
        if (lastCloseTime) {
          flag1 = nowTime - JSON.parse(lastCloseTime) > sevenDaysInMilliseconds;
        } else if (lastSubmitTime) {
          flag2 = nowTime - JSON.parse(lastSubmitTime) > thirtyInMilliseconds;
        }
        if (flag1 && flag2) {
          $(".app-mobile .float-mobile").show();
        } else {
          $(".app-mobile .float-mobile").remove();
        }
      } else {
        $(".app-mobile .float-mobile").show();
      }
    })();
  })();
  // 点击关闭捉虫
  $(".float-wrap .bug-box .icon-close").on("click", function () {
    $(".float-wrap .bug-box").addClass("is-close");
  });

  // 捉虫相关
  (function () {
    const urlArr = location.href.split('/');
    const title = urlArr[urlArr.length - 1].replace('.html', '');
    const version = urlArr[urlArr.length - 4];
    const lang = location.href.split('/')[3];
    const versionObj = lang === 'zh' ? versionObjZh : versionObjEn;
    // 归档版本不支持捉虫
    if (versionObj[version.replaceAll('_',' ')] && versionObj[version.replaceAll('_',' ')].archive) {
      $('.float-wrap .bug-box').css('display', 'none');
      return false;
    }
    $('.float-wrap .bug-box').css('display', 'block');
    function tipShow(value, index) {
        let tipBox = $("<div class='tip-box shake'></div>");
        $(".title-h3")[index].appendChild(tipBox[0]);
        $(".tip-box").text(value).slideToggle(500);
        setTimeout(function () {
          $(".tip-box").slideToggle("slow");
          setTimeout(function () {
            $(".tip-box").remove();
          }, 500);
        }, 2500);
    }
    function issueTemplate(data) {
      let Problem = "";
      data.existProblem.length == 0
        ? ""
        : (Problem = `- ${data.existProblem.join("、")}`);
      return `1. 【文档链接】
    
    > ${data.link}
    
    2. 【"有虫"文档片段】
    
    > ${data.bugDocFragment.replace(/(\r\n|\r|\n)+/g, "$1")}
    
    3. 【存在的问题】
    
    ${Problem}
    > ${data.problemDetail.replace(/(\r\n|\r|\n)+/g, "$1")}
    
    4. 【预期结果】
    - 请填写预期结果`;
    }
    // 选中文字出现捉虫图标
    (function () {
      function selectText() {
        if (document.selection) {
          return document.selection.createRange().text;
        } else {
          return window.getSelection().toString();
        }
      }
      let content = document.querySelector("#content");
      let feedback = document.querySelector(".feedback");
      if (content && feedback) {
        content.onmouseup = function (event) {
          let ev = event || window.event;
          let left = ev.clientX;
          let top = ev.clientY + 30;
          let select = selectText().trim();
          setTimeout(function () {
            if (
              select.length > 0 &&
              window.getSelection() &&
              window.getSelection().type === "Range"
            ) {
              feedback.style.display = "block";
              feedback.style.left = left + "px";
              feedback.style.top = top + "px";
            } else {
              feedback.style.display = "none";
            }
          }, 100);
        };
        content.onclick = function (ev) {
          var ev = ev || window.event;
          ev.cancelBubble = true;
        };
        document.onclick = function () {
          feedback.style.display = "none";
        };

        feedback.onclick = function (e) {
          e.stopPropagation();
          let count = "";
          if (selectText().trim().length > 500) {
            $(".first-input").val(selectText().trim().substring(0, 500));
          } else {
            $(".first-input").val(selectText().trim());
          }
          count = 500 - $(".first-input").val().length;
          $("#text-count").text(count);
          $(".float-wrap .bug-box .bug-text").click();
        };
      }
    })();

    $(".float-wrap .bug-box .bug-text").click(function (e) {
      if ($(".alert").css("display") === "none") {
        e.stopPropagation();
        $(".alert").slideToggle(500);
        $(".baseof_mask").css("display", "block");
      } else {
        $(".alert").slideToggle(500);
        $(".baseof_mask").css("display", "none");
      }
    });
    $(".alert .icon-close").on("click", function (e) {
      e.stopPropagation();
      $(".float-wrap .bug-box .bug-text").click();
      $(".baseof_mask").css("display", "none");
    });
    $(".btn-submit>span").hover(
      function () {
        let submitType = $(".submit-type .active-submit").attr("attr_type");
        if (submitType === "issue") {
          $(".issue-submit-tip").addClass("tip-show");
        } else if (submitType === "PR") {
          $(".pr-submit-tip").addClass("tip-show");
        }
      },
      function () {
        $(".issue-submit-tip").removeClass("tip-show");
        $(".pr-submit-tip").removeClass("tip-show");
      }
    );
    // 点击提交
    $(".btn-submit>span").on("click", function () {
      let questionValue = $(".main-input").val().trim();
      const regR = /[\r\n]+/g;
      let submitType = $(".submit-type .active-submit").attr("attr_type");
      let feedback = $(".issue-reason").val().trim();
      let checkedArr = [];
      const first = questionValue.split(regR)[0];
      $(".alert .active-border span").each(function (index) {
        checkedArr.push($(".alert .active-border span")[index].innerHTML);
      });
      let satisfaction = $(".satisfaction .active");
      // 获取要提交的文件的路径
      const path =
        urlArr[urlArr.length - 2] +
        "/" +
        urlArr[urlArr.length - 1].replace("html", "md");

      let tipText = "";
      if (!questionValue) {
        $(".first-input").focus();
        tipText = lang == "zh" ? "请输入“有虫”片段" : "Enter the buggy content";
        tipShow(tipText, 0);
      } else if (!feedback || !submitType) {
        $(".issue-reason").focus();
        tipText =
          lang == "zh"
            ? "请选择提交类型并输入问题描述"
            : "Choose a submission type and describe the bug";
        tipShow(tipText, 1);
      } else if (satisfaction.length === 0) {
        tipText =
          lang == "zh"
            ? "请选择满意度"
            : "Rate your satisfaction with this document";
        tipShow(tipText, 2);
      } else {
        let postData = {
          bugDocFragment: questionValue,
          existProblem: checkedArr,
          problemDetail: feedback,
          comprehensiveSatisfication: parseInt(satisfaction.attr("key")),
        };
        postData.link = window.location.href;
        function openUrl(url = "#") {
          let tempALink = document.createElement("a");
          tempALink.setAttribute("target", "_blank");
          tempALink.setAttribute("id", "openWin");
          tempALink.setAttribute("href", url);
          document.body.appendChild(tempALink);
          document.getElementById("openWin").click();
          document.body.removeChild(tempALink);
        }
        $.ajax({
          type: "POST",
          url: `/api-dsapi/query/add/bugquestionnaire?community=openeuler&lang=${lang}`,
          data: JSON.stringify(postData),
          contentType: "application/json; charset=utf-8",
          datatype: "json",
          success: function (data) {
            postData.link = window.location.href;
            let body = encodeURIComponent(issueTemplate(postData));
            try {
              if (JSON.parse(data).code === 200) {
                if (submitType === "issue") {
                  openUrl(
                    `https://gitee.com/openeuler/docs-centralized/issues/new?issue%5Bassignee_id%5D=0&issue%5Bmilestone_id%5D=0&title=文档捉虫&description=${body}`
                  );
                } else {
                  openUrl(
                    `https://gitee.com/-/ide/project/openeuler/docs/edit/stable2-${version}/-/docs/${lang}/docs/${path}?search=${first}&title=文档捉虫-openEuler ${version}-${title}&description=${feedback}&message=${feedback}&label_names=文档捉虫`
                  );
                }
              } else {
                console.error(JSON.parse(data));
              }
            } catch (error) {
              console.error(error);
            }
            $("#title-evaluate").css("z-index", "1003");
            $("#title-evaluate img").css("display", "none");
          },
          error: function (err) {
            $("#title-evaluate").css("z-index", "1003");
            $("#title-evaluate img").css("display", "none");
            console.error(err);
          },
        });
      }
    });
    let template = "";
    for (let i = 1; i <= 10; i++) {
      let rank = "";
      if (i <= 6) {
        rank = lang === "zh" ? "失望" : "Disappointed";
      } else if (i > 6 && i <= 8) {
        rank = lang === "zh" ? "一般" : "Neutral";
      } else {
        rank = lang === "zh" ? "满意" : "Satisfied";
      }
      template =
        template +
        `<div class="score" key="${i}">${i}<div class="score-detail" ">${rank}</div></div>`;
    }
    $(".score-box").html(template);
    $(".evaluates .issue").on("click", function () {
      let text = `\n${this.children[0].innerHTML}:`;
      let preTag = null;
      if ($(".active-border").length) {
        preTag = `\n${$(".active-border")[0].childNodes[1].innerHTML}:\n`;
      }
      const textList = $(this).find(".issue-detail").text().split("●");
      for (let i = 0; i < textList.length; i++) {
        textList[i] = textList[i].trim();
      }
      let itemtext = text + textList.join("\n");
      let preText = null;
      if ($(".active-border").length) {
        preText =
          preTag +
          $(".active-border .issue-detail")
            .text()
            .replace(/\s+/gi, "")
            .replaceAll("；", "\n")
            .replaceAll("●", "");
      }
      text = itemtext;
      if ($(this).hasClass("active-border")) {
        text = text.replaceAll(itemtext.trim(), "");
        $(this).removeClass("active-border");
      } else {
        preText ? (text = text.replaceAll(preText.trim(), "")) : "";
        $(this)
          .addClass("active-border")
          .siblings()
          .removeClass("active-border");
      }
      text = text.trim();
      let count = "";
      if (text.trim().length > 500) {
        $(".issue-reason").val(text.trim().substring(0, 500));
      } else if (text.length === 0) {
        $(".issue-reason").val("");
      } else {
        $(".issue-reason").val(`${text.trim()}\n`);
      }
      count = $(".issue-reason").val().length;
      $("#text-count-tow").text(count);
    });
    $(".submit-type .type-issue,.submit-type .type-PR").on(
      "click",
      function () {
        $(this)
          .addClass("active-submit")
          .siblings()
          .removeClass("active-submit");
      }
    );
    $(".satisfaction .score").on("click", function () {
      $(this).addClass("active");
      $(this).siblings(".score").removeClass("active");
    });
    $(".first-input").on("input propertychange", function () {
      let _val = $(this).val();
      let count = "";
      if (_val.length > 500) {
        $(this).val(_val.substring(0, 500));
      }
      count = $(this).val().length;
      $("#text-count").text(count);
    });
    $(".issue-reason").on("input propertychange", function () {
      (_val = $(this).val()), (count = "");
      if (_val.length > 500) {
        $(this).val(_val.substring(0, 500));
      }
      count = $(this).val().length;
      $("#text-count-tow").text(count);
    });
  })();
});
