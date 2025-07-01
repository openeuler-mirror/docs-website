// @ts-expect-error public资源导入
import TOC from '/toc/toc.json?url&raw';
// @ts-expect-error public资源导入
import TOC_EN from '/toc/toc-en.json?url&raw';

export const TOC_CONFIG = JSON.parse(TOC);
export const TOC_EN_CONFIG = JSON.parse(TOC_EN);