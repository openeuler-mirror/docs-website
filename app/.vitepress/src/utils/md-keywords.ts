/**
 * 归一化 frontmatter keywords 为 <meta name="keywords"> 的 content 字符串
 * @param {unknown} value frontmatter 中的 keywords 原始值（字符串或字符串数组）
 * @returns {string} 逗号分隔的关键字列表，无有效关键字时返回空字符串
 */
export function normalizeKeywords(value: unknown): string {
  let list: unknown[] = [];

  // 数组直接逐项处理，字符串按中英文逗号拆分，其余类型忽略
  if (Array.isArray(value)) {
    list = value;
  } else if (typeof value === 'string') {
    list = value.split(/[,，]/);
  }

  const keywords = new Set<string>();
  for (const item of list) {
    // 仅保留字符串项，压缩空白（head 渲染时 VitePress 会对属性值做 HTML 转义，无需自行去除特殊字符）
    if (typeof item !== 'string') {
      continue;
    }
    const keyword = item.replace(/\s+/g, ' ').trim();

    // 跳过空关键字，Set 自动去重
    if (keyword) {
      keywords.add(keyword);
    }
  }

  return [...keywords].join(',');
}
