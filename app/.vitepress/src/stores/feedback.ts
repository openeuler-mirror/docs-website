import { defineStore } from 'pinia';
import { ref } from 'vue';

import { postArticleFeedback, type FeedBackDataT } from '@/api/api-feedback';
import { useNodeStore } from './node';
import { useLocale } from '@/composables/useLocale';

const bodyZh = `
1. 【文档链接】

> {link}

2. 【评分情况】

>获取效率：{efficiency}
>正确性：{accuracy}
>完整性：{completeness}
>易理解：{usability}

3. 【问题或改进建议】

> {feedback}
`.trim();

const bodyEn = `
1.[Doc Link]

> {link}

2.[Retings]

>Retrieval efficiency: {efficiency}
>Accuracy: {accuracy}
>Completeness: {completeness}
>Comprehensibility: {usability}

3.[Feedback]

> {feedback}
`.trim();

export const useFeedbackDocStore = defineStore('feedback-doc', () => {
  const { isZh } = useLocale();
  const nodeStore = useNodeStore();
  const efficiency = ref(0);
  const accuracy = ref(0);
  const completeness = ref(0);
  const usability = ref(0);
  const feedback = ref('');

  function reset() {
    efficiency.value = 0;
    accuracy.value = 0;
    completeness.value = 0;
    usability.value = 0;
    feedback.value = '';
  }

  async function submitRate(data: FeedBackDataT) {
    try {
      const res = await postArticleFeedback(data);
      if (res.code === 200) {
        return true;
      }
    } catch {
      // nothing
    }

    return false;
  }

  async function submitIssue(data: FeedBackDataT) {
    const result = await submitRate(data);
    if (result) {
      const content = (isZh.value ? bodyZh : bodyEn)
        .replace('{link}', data.feedbackPageUrl)
        .replace('{efficiency}', String(data.efficiency))
        .replace('{accuracy}', String(data.accuracy))
        .replace('{completeness}', String(data.completeness))
        .replace('{usability}', String(data.usability))
        .replace('{feedback}', data.feedback || '');

      const issueBaseUrl = nodeStore.pageNode?.upstream ? nodeStore.pageNode.upstream.split('/blob')[0] : 'https://atomgit.com/openeuler/docs';
      window.open(`${issueBaseUrl}/issues/new?title=${ isZh.value ? '文档评分' : 'Ratings' }&body=${encodeURIComponent(content)}`, '_blank', 'noopener noreferrer');
    }

    return result;
  }

  return {
    efficiency,
    accuracy,
    completeness,
    usability,
    feedback,
    reset,
    submitRate,
    submitIssue,
  };
});
