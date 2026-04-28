import { describe, expect, it } from 'vitest';
import { getMdTitleId, getMdFilterContent } from '../../scripts/utils/markdown.js';

describe('getMdFilterContent', () => {
  it('去除 HTML 标签', () => {
    expect(getMdFilterContent('<div>content</div>')).toBe('content');
    expect(getMdFilterContent('<span class="test">text</span>')).toBe('text');
  });

  it('去除反引号', () => {
    expect(getMdFilterContent('`code`')).toBe('code');
    expect(getMdFilterContent('``code``')).toBe('code');
  });

  it('同时去除 HTML 标签和反引号', () => {
    expect(getMdFilterContent('<code>`test`</code>')).toBe('test');
  });

  it('处理嵌套 HTML 标签', () => {
    expect(getMdFilterContent('<div><span>text</span></div>')).toBe('text');
  });

  it('保留普通文本', () => {
    expect(getMdFilterContent('plain text')).toBe('plain text');
  });

  it('处理空字符串', () => {
    expect(getMdFilterContent('')).toBe('');
  });

  it('处理纯 HTML 标签无内容', () => {
    expect(getMdFilterContent('<div></div>')).toBe('');
  });

  it('处理自闭合标签', () => {
    expect(getMdFilterContent('<br/>text<hr/>')).toBe('text');
  });

  it('保留换行符', () => {
    expect(getMdFilterContent('line1\nline2')).toBe('line1\nline2');
  });

  it('处理多个空格', () => {
    expect(getMdFilterContent('a   b')).toBe('a   b');
  });
});

describe('getMdTitleId', () => {
  it('将标题转换为小写并空格替换为连字符', () => {
    expect(getMdTitleId('Hello World')).toBe('hello-world');
  });

  it('过滤特殊字符', () => {
    const result = getMdTitleId('Title!@#$%');
    expect(result).not.toContain('!');
    expect(result).not.toContain('@');
  });

  it('处理中文标题', () => {
    const result = getMdTitleId('中文标题 测试');
    expect(result).toContain('-');
  });

  it('处理包含代码的标题', () => {
    expect(getMdTitleId('`code` Title')).toBe('code-title');
  });

  it('处理包含 HTML 的标题', () => {
    expect(getMdTitleId('<span>Title</span>')).toBe('title');
  });

  it('处理多个空格', () => {
    expect(getMdTitleId('Title   With   Spaces')).toBe('title---with---spaces');
  });

  it('处理空字符串', () => {
    expect(getMdTitleId('')).toBe('');
  });

  it('处理纯数字标题', () => {
    expect(getMdTitleId('123 456')).toBe('123-456');
  });

  it('处理已包含连字符的标题', () => {
    expect(getMdTitleId('Already-Hyphenated')).toBe('already-hyphenated');
  });

  it('处理混合大小写', () => {
    expect(getMdTitleId('MixedCase Title')).toBe('mixedcase-title');
  });

  it('过滤各种标点符号', () => {
    expect(getMdTitleId('Title, with; punctuation!')).toBe('title-with-punctuation');
  });

  it('处理下划线', () => {
    const result = getMdTitleId('Title_With_Underscore');
    expect(result).toBe('title_with_underscore');
  });
});