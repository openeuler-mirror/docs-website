import type { CancelToken } from 'axios';
import { request } from '@/shared/axios';
import type { AxiosResponse } from '@/shared/axios';

import type { SearchRecommendT, SearchDocQueryT } from '@/@types/type-search';

/**
 * 获取热门搜索数据
 * @param {String} params 语言
 * @returns {Object}
 */
export function getPop(params: string): Promise<{
  msg: string;
  obj: string[];
  status: number;
}> {
  const url = `/api-search/search/pop?${params}`;
  return request
    .post(
      url,
      // TODO: 取消手动添加请求头
      {},
      {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
        showError: false,
      }
    )
    .then((res: AxiosResponse) => res.data);
}

/**
 * 关联搜索
 * @param {Object} params 申请表格数据
 * @return  {Object}
 */
export function getSearchRecommend(params: { query: string }, cancelToken?: CancelToken): Promise<{
  status: number;
  obj: {
    word: SearchRecommendT[];
  };
  msg: string;
}> {
  const url = `/api-search/search/word?query=${params.query}`;
  return request.post(url, params, { 
    showError: false,
    cancelToken,
  }).then((res: AxiosResponse) => res.data);
}

/**
 * 获取文档搜索结果
 * @param {SearchDocQueryT} params 搜索参数对象
 * @returns {Promise<ResponseT>}  搜索结果
 */
export function getSearchDocs(params: SearchDocQueryT) {
  const url = '/api-search/search/sort/docs';
  return request.post(url, params, { showError: false }).then((res: AxiosResponse) => res.data);
}

/**
 * 搜索直达
 * @param {Object} params 搜索参数
 * @return  {Object}
 */
export function getOnestepSearch(params: { query: string; lang: string }): Promise<{
  status: number;
  obj: {
    word: SearchRecommendT[];
  };
  msg: string;
}> {
  const url = `/api-search/search/webword?query=${params.query}`;
  return request.post(url, params, { showError: false }).then((res: AxiosResponse) => res.data);
}

/**
 * 上传图片，获取OBS图片URL
 * @param {Object} params 包含image文件对象
 * @returns {Promise<ResponseT>} OBS图片URL
 */
export function imageUpload(params: { image: File }): Promise<{
  msg: string;
  obj: string;
  status: number;
}> {
  const url = '/api-search/search/sort/upload/image';
  const formData = new FormData();
  formData.append('image', params.image);
  return request
    .post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      showError: false,
    })
    .then((res: AxiosResponse) => res.data);
}
