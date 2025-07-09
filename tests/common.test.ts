import { describe, expect, it } from 'vitest';
import {
  changeTimeStamp,
  getDomId,
  getSearchUrlParams,
  getUrlParams,
  getVersionFromUrl,
  getYearByOffset,
  isValidKey,
} from '../app/.vitepress/src/utils/common';

describe('changeTimeStamp', () => {
  it('获取格式化时间', () => {
    const date = new Date();
    const result = changeTimeStamp(date.getTime() / 1000);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const format = `${date.getFullYear()}/${month}/${day}`;
    expect(result).toBe(format);
  });
});

describe('getUrlParams', () => {
  it('存在 url 参数', () => {
    expect(getUrlParams('http://example.com?a=1')).toHaveProperty('a');
    expect(getUrlParams('http://example.com?a=1&b=2')).toHaveProperty('b');
  });

  it('不存在 url 参数', () => {
    expect(getUrlParams('http://example.com?a=1')).not.toHaveProperty('c');
    expect(getUrlParams('http://example.com?a=1&b=2')).not.toHaveProperty('c');
  });

  it('非法 url 地址', () => {
    expect(getUrlParams('sdfgdfsgasDKJBFSJKFB')).toBe(undefined);
  });
});

describe('getSearchUrlParams', () => {
  it('getSearchUrlParams', () => {
    const result = getSearchUrlParams('http://example.com?a=1&b=2');
    expect(result.get('a')).toBe('1');
  });
});

describe('isValidKey', () => {
  it('key 为 string', () => {
    const obj1 = { key: 1 };
    expect(isValidKey('key', obj1)).toBe(true);
    expect(isValidKey('b', obj1)).toBe(false);
  });

  it('key 为 number', () => {
    const obj1 = { 1: 1 };
    expect(isValidKey(1, obj1)).toBe(true);
    expect(isValidKey(2, obj1)).toBe(false);
  });

  it('key 为 symbol', () => {
    const symbol1 = Symbol('key1');
    const symbol2 = Symbol('key2');
    const obj1 = { [symbol1]: 1 };
    expect(isValidKey(symbol1, obj1)).toBe(true);
    expect(isValidKey(symbol2, obj1)).toBe(false);
  });
});

describe('getYearByOffset', () => {
  it('getYearByOffset', () => {
    const date = new Date();
    expect(getYearByOffset()).toBe(date.getFullYear());
  });
});

describe('getVersionFromUrl', () => {
  it('getVersionFromUrl', () => {
    expect(getVersionFromUrl('/zh/docs/25.03/server/index.html')).toBe('25.03');
    expect(getVersionFromUrl('/zh/docs/common/contribute/directory_structure_introductory.html')).toBe('common');
  });
});

describe('getDomId', () => {
  it('getDomId', () => {
    expect(getDomId('aa bb cc')).toBe('aa-bb-cc');
    expect(getDomId('a&b')).toBe('a-b');
    expect(getDomId('a-c')).toBe('a-c');
  });
});
