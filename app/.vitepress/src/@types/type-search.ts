import type { DocMenuNodeT } from '@/utils/tree';

export interface SearchRecommendT {
  key: string;
  count: number;
  keyHtml: string;
}

// 文档搜索参数
export interface SearchDocQueryT {
  keyword: string;
  lang: string;
  page: number;
  version: string;
  path: string;
}

// 文档搜索结果
export interface SearchDocItemT {
  articleName: string;
  lang: string;
  path: string;
  score: number;
  textContent: string;
  title: string;
  type: string;
  version: string;
  sourceData: DocMenuNodeT[];
}
