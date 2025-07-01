import { request } from '@/shared/axios';
import type { AxiosResponse } from '@/shared/axios';

import type { DocsBugParamsT } from '@/@types/type-feedback';

export interface FeedBackQueryT {
  feedbackPageUrl: string;
  feedbackText: string;
  feedbackValue: number;
}

export interface FeedBackDataT {
  feedbackPageUrl: string;
  efficiency: number;
  accuracy: number;
  completeness: number;
  usability: number;
}

/**
 * 文档中心满意度评分
 * @param {FeedBackQueryT} params
 * @returns {Promise<ResponseT>}
 */
export function postFeedback(params: FeedBackQueryT): Promise<{
  code: number;
  data: string;
  msg: string;
  update_at: string;
}> {
  const url = '/api-dsapi/query/nps?community=openeuler';
  return request.post(url, params, { showError: false }).then((res: AxiosResponse) => res.data);
}

/**
 * 文档内容满意度评分
 * @param {FeedBackQueryT} params
 * @returns {Promise<ResponseT>}
 */
export function postArticleFeedback(params: FeedBackDataT): Promise<{
  code: number;
  data: string;
  msg: string;
  update_at: string;
}> {
  const url = '/api-dsapi/query/doc/nps/openeuler';
  return request.post(url, params, { showError: false }).then((res: AxiosResponse) => res.data);
}

/**
 * 文档捉虫
 * @param {string} lang 语言
 * @param { DocsBugParamsT } params 文档捉虫参数类型
 * @returns {Promise<ResponseT>}
 */
export function submitDocsBug(lang: string, params: DocsBugParamsT) {
  const url = `/api-dsapi/query/add/bugquestionnaire?community=openeuler&lang=${lang}`;
  return request.post(url, params, { showError: false }).then((res) => {
    return res.data;
  });
}
