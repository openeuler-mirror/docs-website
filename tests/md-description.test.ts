import { describe, expect, it } from 'vitest';
import {
  MAX_DESCRIPTION_LENGTH,
  extractFirstParagraph,
} from '../app/.vitepress/src/utils/md-description';

describe('extractFirstParagraph', () => {
  it('跳过 frontmatter 与标题，提取第一个段落', () => {
    const md = '---\ntitle: 指南\n---\n\n# 指南\n\nopenEuler 是一个开源操作系统。\n\n第二段不该出现。';
    expect(extractFirstParagraph(md)).toBe('openEuler 是一个开源操作系统。');
  });

  it('无 frontmatter 时直接提取', () => {
    expect(extractFirstParagraph('这是一段描述。\n\n其他内容')).toBe('这是一段描述。');
  });

  it('BOM 头也能正确去掉 frontmatter', () => {
    const md = '\uFEFF---\ntitle: a\n---\n带 BOM 的第一段。';
    expect(extractFirstParagraph(md)).toBe('带 BOM 的第一段。');
  });

  it('跳过引用、表格、列表、分隔线与独立图片', () => {
    const md = [
      '> [!NOTE]',
      '> 说明文字',
      '',
      '| a | b |',
      '| - | - |',
      '',
      '- 列表项',
      '1. 有序项',
      '',
      '---',
      '',
      '![图1](./img.png)',
      '',
      '真正的第一个段落。',
    ].join('\n');
    expect(extractFirstParagraph(md)).toBe('真正的第一个段落。');
  });

  it('段落已开始遇到块级元素则结束段落', () => {
    const md = '第一段文字\n\n# 标题\n\n第二段';
    expect(extractFirstParagraph(md)).toBe('第一段文字');
  });

  it('跳过代码块内容', () => {
    const md = '```\ncd /tmp\n```\n\n安装步骤如下。';
    expect(extractFirstParagraph(md)).toBe('安装步骤如下。');
  });

  it('段落已开始遇到代码围栏视为段落结束', () => {
    const md = '开头段落\n\n```\ncode\n```';
    expect(extractFirstParagraph(md)).toBe('开头段落');
  });

  it('段落行后紧跟代码围栏结束段落', () => {
    const md = '开头段落\n```\ncode\n```\n\n后续';
    expect(extractFirstParagraph(md)).toBe('开头段落');
  });

  it('段落行后紧跟块级元素结束段落', () => {
    const md = '第一段文字\n| 列 | 列 |';
    expect(extractFirstParagraph(md)).toBe('第一段文字');
  });

  it('波浪线代码块同样被跳过', () => {
    const md = '~~~\ncode\n~~~\n\n描述段落';
    expect(extractFirstParagraph(md)).toBe('描述段落');
  });

  it('独立 HTML 行被跳过，后续段落被提取', () => {
    const md = '<div>x</div>\n\nhtml 之后的段落';
    expect(extractFirstParagraph(md)).toBe('html 之后的段落');
  });

  it('合并软换行为同一段落', () => {
    const md = '这是第一行\n这是第二行\n\n下一段';
    expect(extractFirstParagraph(md)).toBe('这是第一行 这是第二行');
  });

  it('清理行内 markdown 语法', () => {
    const md = '查看 **安装** 与 `配置` 指南，参考 [官方文档](https://example.com) [^1]。';
    expect(extractFirstParagraph(md)).toBe('查看 安装 与 配置 指南，参考 官方文档 。');
  });

  it('清理图片、引用链接与斜体强调', () => {
    const md = '如图 ![截图](./a.png) 所示，详见 [文档][ref]，*注意* __重点__。';
    expect(extractFirstParagraph(md)).toBe('如图 所示，详见 文档，注意 重点。');
  });

  it('去掉 html 注释与残留尖括号', () => {
    const md = '前 <!-- 注释 --> 后 < 残留';
    expect(extractFirstParagraph(md)).toBe('前 后 残留');
  });

  it('英文双引号替换为单引号避免破坏 meta 属性', () => {
    const md = '他说 "hello" 了';
    expect(extractFirstParagraph(md)).toBe("他说 'hello' 了");
  });

  it('超长段落被截断到最大长度', () => {
    const md = '长'.repeat(MAX_DESCRIPTION_LENGTH + 50);
    const result = extractFirstParagraph(md);
    expect(result.length).toBe(MAX_DESCRIPTION_LENGTH);
    expect(result.endsWith('…')).toBe(true);
  });

  it('没有有效段落时返回空字符串', () => {
    const md = '---\ntitle: a\n---\n\n# 标题\n\n> 引用\n\n- 列表';
    expect(extractFirstParagraph(md)).toBe('');
  });

  it('空内容返回空字符串', () => {
    expect(extractFirstParagraph('')).toBe('');
  });
});
