import { describe, expect, it } from 'vitest';
import { normalizeKeywords } from '../app/.vitepress/src/utils/md-keywords';

describe('normalizeKeywords', () => {
  it('数组关键字用逗号拼接', () => {
    expect(normalizeKeywords(['openEuler', 'Linux'])).toBe('openEuler,Linux');
  });

  it('字符串按中英文逗号拆分', () => {
    expect(normalizeKeywords('openEuler, Linux，操作系统')).toBe('openEuler,Linux,操作系统');
  });

  it('压缩关键字内部空白并去除首尾空白', () => {
    expect(normalizeKeywords(['  open   Euler  ', 'a\nb'])).toBe('open Euler,a b');
  });

  it('去重且保持顺序', () => {
    expect(normalizeKeywords(['a', 'b', 'a'])).toBe('a,b');
  });

  it('忽略空字符串与非字符串项', () => {
    expect(normalizeKeywords(['a', '', '   ', 1, null, undefined, {}])).toBe('a');
  });

  it('保留特殊字符交给渲染层转义', () => {
    expect(normalizeKeywords(['A&B', '"引号"', '<tag>'])).toBe('A&B,"引号",<tag>');
  });

  it('undefined / null / 数字等非法值返回空字符串', () => {
    expect(normalizeKeywords(undefined)).toBe('');
    expect(normalizeKeywords(null)).toBe('');
    expect(normalizeKeywords(123)).toBe('');
    expect(normalizeKeywords(true)).toBe('');
  });

  it('全部为无效项时返回空字符串', () => {
    expect(normalizeKeywords(['', ' '])).toBe('');
    expect(normalizeKeywords('')).toBe('');
    expect(normalizeKeywords('，,')).toBe('');
  });
});
