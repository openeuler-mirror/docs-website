/** 页面描述最大长度（对齐搜索引擎展示长度） */
export const MAX_DESCRIPTION_LENGTH = 160;

/**
 * 去掉 markdown 文件头部的 frontmatter 块
 * @param {string} raw markdown 原始内容
 * @returns {string} 去掉 frontmatter 后的正文
 */
function stripFrontmatter(raw: string): string {
  return raw.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

/**
 * 清理行内 markdown / html 语法，保留纯文本
 * @param {string} text 行内文本
 * @returns {string} 纯文本
 */
function cleanInlineText(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/"/g, "'")
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 判断是否为不作为正文段落的块级起始行（标题/引用/表格/列表/HTML/分隔线/独立图片）
 * @param {string} line 去除首尾空白后的行
 * @returns {boolean} 是否为块级起始行
 */
function isBlockLine(line: string): boolean {
  return (
    /^#{1,6}\s/.test(line) ||
    /^>\s?/.test(line) ||
    /^\|/.test(line) ||
    /^(---+|\*\*\*+|___+)$/.test(line) ||
    /^([-*+]|\d+[.)])\s/.test(line) ||
    /^</.test(line) ||
    /^!?\[[^\]]*\]\([^)]*\)$/.test(line)
  );
}

/**
 * 提取 markdown 正文中第一个自然段的纯文本，可用作页面 description
 * @param {string} raw markdown 原始内容
 * @returns {string} 第一段纯文本（超长时截断），不存在有效段落时返回空字符串
 */
export function extractFirstParagraph(raw: string): string {
  const lines = stripFrontmatter(raw).split(/\r?\n/);
  const paragraph: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 代码块围栏：段落未开始时进入/退出代码块，段落已开始则视为段落结束
    if (/^(```|~~~)/.test(trimmed)) {
      if (paragraph.length) {
        break;
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // 代码块内部内容整体跳过
    if (inCodeBlock) {
      continue;
    }

    // 空行：段落已开始则结束段落
    if (trimmed === '') {
      if (paragraph.length) {
        break;
      }
      continue;
    }

    // 块级元素不作为正文段落，段落已开始则视为结束
    if (isBlockLine(trimmed)) {
      if (paragraph.length) {
        break;
      }
      continue;
    }

    paragraph.push(trimmed);
  }

  const text = cleanInlineText(paragraph.join(' '));

  // 超长时按最大展示长度截断
  if (text.length > MAX_DESCRIPTION_LENGTH) {
    return `${text.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`;
  }

  return text;
}
