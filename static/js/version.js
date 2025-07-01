/**
 * @file 根据版本数据生成相应的版本选择元素
 */
$(document).ready(function () {
  (function () {
    const lang = location.href.split('/')[3];
    const versionObj = lang === 'zh' ? versionObjZh : versionObjEn;
    let spanElement1 = '';
    let spanElement2 = '';
    let spanElement3 = '';
    Object.keys(versionObj).forEach((key) => {
      if (key.includes('LTS') && !versionObj[key].archive) {
        spanElement1 =
          spanElement1 +
          `<li><a href="${versionObj[key].homePath.startsWith('http') ? versionObj[key].homePath : `/${lang}/docs${versionObj[key].homePath}`}">${key}</a></li>`;
      } else if (!versionObj[key].archive) {
        spanElement2 =
          spanElement2 +
          `<li><a href="${versionObj[key].homePath.startsWith('http') ? versionObj[key].homePath : `/${lang}/docs${versionObj[key].homePath}`}">${key}</a></li>`;
      } else {
        spanElement3 =
          spanElement3 +
          `<li><a href="${versionObj[key].homePath.startsWith('http') ? versionObj[key].homePath : `/${lang}/docs${versionObj[key].homePath}`}">${key}</a></li>`;
      }
    });
    $('#left>.version-list,#h5_versions').prepend(spanElement1 + spanElement2);
    $('.long-time .version-list').prepend(spanElement1);
    $('.innovate .version-list').prepend(spanElement2);
    $('.archive .version-list').prepend(spanElement3);
  })();
});
