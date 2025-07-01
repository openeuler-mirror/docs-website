<script setup lang="ts">
import { reactive, ref, toRefs } from 'vue';
import {
  ODialog,
  OForm,
  OFormItem,
  type RulesT,
  type FieldResultT,
  OTextarea,
  OButton,
  ORadioGroup,
  ORadio,
  OToggle,
  OCheckbox,
  OLink,
  useMessage,
} from '@opensig/opendesign';

import { useData } from 'vitepress';

import type { DocsBugParamsT } from '@/@types/type-feedback';

import { submitDocsBug } from '@/api/api-feedback';

import { useLocale } from '@/composables/useLocale';
import { oaReport } from '@/shared/analytics';
import { useNodeStore } from '@/stores/node';
import { useViewStore } from '@/stores/view';

const VITE_MAIN_DOMAIN_URL = import.meta.env.VITE_MAIN_DOMAIN_URL;
const message = useMessage();
const { t, locale } = useLocale();
const { page } = useData();
const viewStore = useViewStore();
const nodeStore = useNodeStore();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  selectionText: {
    type: String,
    default: '',
  },
});
const { modelValue } = toRefs(props);
const emit = defineEmits(['update:modelValue']);

const formData = reactive({
  fragment: '',
  description: '',
});
const formRef = ref<InstanceType<typeof OForm>>();

// -------------------- bug文档片段验证 --------------------
const fragmentRules = reactive<RulesT[]>([
  {
    required: true,
    message: t('feedback.input'),
    triggers: ['blur'],
  },
]);
// -------------------- bug文档片段验证 --------------------
const descriptionRules = reactive<RulesT[]>([
  {
    required: true,
    message: t('feedback.input'),
    triggers: ['blur'],
  },
]);

// -------------------- 提交类型 --------------------
const submitType = ref('issue');
const submitTypeOptions = [
  {
    label: 'Issue',
    value: 'issue',
  },
  {
    label: 'PR',
    value: 'pr',
  },
];
// -------------------- 提交类型 --------------------
const questionType = ref('规范和低错类');
const questionTypeOptions = [
  {
    label: {
      zh: '规范和低错类',
      en: 'Specifications and Common Mistakes',
    },
    value: {
      zh: '规范和低错类',
      en: 'Specifications and Common Mistakes',
    },
  },
  {
    label: {
      zh: '易用性',
      en: 'Usability',
    },
    value: {
      zh: '易用性',
      en: 'Usability',
    },
  },
  {
    label: {
      zh: '正确性',
      en: 'Correctness',
    },
    value: {
      zh: '正确性',
      en: 'Correctness',
    },
  },
  {
    label: {
      zh: '风险提示',
      en: 'Risk Warnings',
    },
    value: {
      zh: '风险提示',
      en: 'Risk Warnings',
    },
  },
  {
    label: {
      zh: '内容合规',
      en: 'Content Compliance',
    },
    value: {
      zh: '内容合规',
      en: 'Content Compliance',
    },
  },
];

const isAgree = ref<(string | number)[]>([]);
const onAgree = () => {};

const issueTemplate = (data: DocsBugParamsT) => {
  let problem = '';
  if (data.existProblem.length == 0) {
    problem = `- ${data.existProblem.join('、')}`;
  }

  return `1. 【文档链接】
    
    > ${data.link}
    
    2. 【"有虫"文档片段】
    
    > ${data.bugDocFragment.replace(/(\r\n|\r|\n)+/g, '$1')}
    
    3. 【存在的问题】
    
    ${problem}
    > ${data.problemDetail.replace(/(\r\n|\r|\n)+/g, '$1')}
    
    4. 【预期结果】
    - 请填写预期结果`;
};

const submitBug = (results: FieldResultT[]) => {
  const regR = /[\r\n]+/g;
  const first = formData.fragment.split(regR)[0];

  if (results.find((item) => item?.type === 'danger')) {
    return;
  } else {
    const postData = {
      bugDocFragment: formData.fragment,
      existProblem: [questionType.value],
      problemDetail: formData.description,
      comprehensiveSatisfication: 10,
      link: window.location.href,
    };
    reportAnalytics(postData);
    submitDocsBug(locale.value, postData)
      .then((res) => {
        const body = encodeURIComponent(issueTemplate(postData));
        if (res.code === 200) {
          emit('update:modelValue', false);
          if (submitType.value === 'issue') {
            const issueBaseUrl = nodeStore.pageNode?.upstream ? nodeStore.pageNode.upstream.split('/blob')[0] : 'https://gitee.com/openeuler/docs';
            window.open(`${issueBaseUrl}/issues/new?issue%5Bassignee_id%5D=0&issue%5Bmilestone_id%5D=0&title=文档捉虫&description=${body}`);
          } else {
            let pathname = window.location.pathname;
            if (pathname.endsWith('.html')) {
              pathname = pathname.replace('.html', '.md');
            } else if (pathname.endsWith('/')) {
              pathname = `${pathname}index.md`;
            } else {
              pathname = `${pathname}.md`;
            }

            const [_, lang, __, branch, ...others] = pathname.split('/');
            if (viewStore.isOverview && nodeStore.pageNode?.href) {
              const arr = nodeStore.pageNode.href.replace('index.html', '_toc.yaml').split('/');
              window.open(`https://gitee.com/-/ide/project/openeuler/docs/edit/stable-${arr[3]}/-/docs/${lang}/${arr.slice(4).join('/')}?search=${first}&title=文档捉虫-openEuler ${branch}-${page.value.title}&description=${formData.description}&message=${formData.description}&label_names=文档捉虫`);
            } else if (nodeStore.pageNode?.upstream) {
              const arr = nodeStore.pageNode.upstream.split('/');
              window.open(`https://gitee.com/-/ide/project/${arr[3]}/${arr[4]}/edit/${arr[6]}/-/${arr.slice(7).join('/')}?search=${first}&title=文档捉虫-openEuler ${branch}-${page.value.title}&description=${formData.description}&message=${formData.description}&label_names=文档捉虫`);
            } else {
              window.open(`https://gitee.com/-/ide/project/openeuler/docs/edit/stable-${branch}/-/docs/${lang}/${others.join('/')}?search=${first}&title=文档捉虫-openEuler ${branch}-${page.value.title}&description=${formData.description}&message=${formData.description}&label_names=文档捉虫`);
            }
           
          }
        }
      })
      .catch(() => {
        message.danger({
          content: t('feedback.feedbackFailed'),
        });
      });
  }
};

const reportAnalytics = (data: DocsBugParamsT) => {
  oaReport('click', {
    type: 'bug',
    content: data,
  });
};

const change = (visible: boolean) => {
  if (!visible) {
    emit('update:modelValue', false);
    formRef.value?.resetFields();
    formData.fragment = '';
    submitType.value = '';
    questionType.value = '';
  } else {
    formData.fragment = props.selectionText;
    submitType.value = 'issue';
    questionType.value = '规范和低错类';
  }
};
</script>
<template>
  <ODialog :visible="modelValue" @change="change" class="docs-bug-dialog">
    <template #header>
      <div class="title-header">
        <p class="title">{{ t('feedback.bugCatchingTitle') }}</p>
      </div>
    </template>
    <OForm ref="formRef" :model="formData" has-required layout="v" @submit="submitBug">
      <OFormItem field="fragment" :label="t('feedback.bugContentTitle')" :rules="fragmentRules">
        <OTextarea v-model="formData.fragment" :placeholder="t('feedback.bugContentPlaceholder')" size="large" resize="none" />
      </OFormItem>
      <OFormItem :label="t('feedback.bugDescription')" field="description" :rules="descriptionRules">
        <div class="select">
          <p class="text">{{ t('feedback.submitAs') }}</p>
          <ORadioGroup class="select-options" v-model="submitType" :style="{ gap: `8px` }">
            <ORadio v-for="option in submitTypeOptions" :key="option.value" :value="option.value">
              <template #radio="{ checked }">
                <OToggle :class="{ active: checked }" :style="{ '--toggle-padding': '4px 16px', '--toggle-radius': '4px' }" :checked="checked">
                  {{ option.label }}
                </OToggle>
              </template>
            </ORadio>
          </ORadioGroup>
        </div>
        <div class="select">
          <p class="text">{{ t('feedback.bugType') }}</p>
          <ORadioGroup class="select-options" v-model="questionType" :style="{ gap: `8px` }">
            <ORadio v-for="option in questionTypeOptions" :key="option.value[locale]" :value="option.value[locale]">
              <template #radio="{ checked }">
                <OToggle :class="{ active: checked }" :style="{ '--toggle-padding': '4px 16px', '--toggle-radius': '4px' }" :checked="checked">
                  {{ option.label[locale] }}
                </OToggle>
              </template>
            </ORadio>
          </ORadioGroup>
        </div>
        <OTextarea v-model="formData.description" :placeholder="t('feedback.bugDescriptionPlaceholder')" size="large" resize="none" />
      </OFormItem>
      <div class="agree-box">
        <OCheckbox v-model="isAgree" :value="1" @change="onAgree">
          {{ t('feedback.bugPostPrivacyPolicy') }}
          <OLink color="primary" hover-underline :href="`${VITE_MAIN_DOMAIN_URL}/zh/other/privacy/`" target="_blank"> {{ t('feedback.privacyPolicy') }} </OLink>
        </OCheckbox>
      </div>
      <div class="btn">
        <OButton color="primary" variant="solid" size="large" :disabled="!isAgree?.length" type="submit">{{ t('feedback.submit') }}</OButton>
      </div>
    </OForm>
  </ODialog>
</template>
<style lang="scss">
.docs-bug-dialog {
  color: var(--o-color-info1);
  .o-dlg-body {
    padding: 24px 105px 32px;
  }
}
</style>
<style lang="scss" scoped>
:deep(.o-dialog) {
  --dlg-body-padding: 24px 105px;
}

.title-header {
  display: flex;
  justify-content: center;
  align-items: center;
  .tips {
    margin-left: 8px;
  }
}

.tips-link {
  padding: 0;
  :deep(.o-link-label) {
    display: flex;
  }
}

.o-textarea {
  width: 720px;
}
.o-input {
  width: 312px;
}

:deep(.o_textarea) {
  height: 124px;
  .o_textarea-wrap {
    height: 100%;
  }

  @include respond-to('<=pad') {
    height: 114px;
  }
}

:deep(.o-form-item) {
  .o-form-item-label {
    margin-bottom: 12px;
    @include text2;
  }
}

:deep(.o-form-item-main-wrap) {
  flex-direction: column;
  align-items: flex-start;
}

.select {
  display: flex;
  align-items: center;
  .text {
    width: 70px;
    color: var(--o-color-info1);
    font-weight: 500;
    @include text1;
  }

  &:nth-of-type(1) {
    margin: 4px 0 8px;
  }
  &:nth-of-type(2) {
    margin-bottom: 12px;
  }
}

[lang='en'] {
  .select .text {
    width: 100px;
  }

  .o-radio-group {
    width: 550px;
  }
}
.select-options {
  --radio-group-gap: 0;
  margin-left: 56px;
}

.email-tips {
  @include tip1;
  color: var(--o-color-info2);
  margin-top: 8px;
}

.btn {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
