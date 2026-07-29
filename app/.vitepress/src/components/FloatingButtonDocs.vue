<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch, markRaw } from 'vue';
import { OIcon, OPopup, OLink, ODivider } from '@opensig/opendesign';
import { OFeedbackDoc, OFeedbackDocDialog } from '@opendesign-plus/components';

import DocBugDialog from '@/components/doc/DocBugDialog.vue';

import IconSmile from '~icons/footer/icon-smile.svg';

import IconQuickIssue_light from '~icons/footer/icon-quickissue_light.svg';
import IconQuickIssue_dark from '~icons/footer/icon-quickissue_dark.svg';
import IconChat from '~icons/footer/icon-chat.svg';
import IconHeadset from '~icons/feedback/icon-headset.svg';
import IconFAQ from '~icons/feedback/icon-faq.svg';

import IconTips from '~icons/app/icon-tips.svg';
import IconTop from '~icons/app/icon-top.svg';

import { scrollToTop } from '@/utils/common';

import { useAppearance } from '@/stores/common';
import { useScreen } from '@/composables/useScreen';
import { useLocale } from '@/composables/useLocale';
import { useNodeStore } from '@/stores/node';
import { useFeedbackDocStore } from '@/stores/feedback';

const { t, locale } = useLocale();
const { isPhone, gtPhone } = useScreen();
const nodeStore = useNodeStore();
const feedbackDocStore = useFeedbackDocStore();

const isDark = computed(() => {
  return useAppearance().theme === 'dark' ? true : false;
});

const docBugVisible = ref(false);

// -------------------- 评分 --------------------
const showPopup = ref(false); // 显示评分详细

watch(
  () => showPopup.value,
  () => {
    multiRate.forEach((item) => {
      item.value = 0;
      item.isChange = false;
    });
  }
);

const multiRate = reactive([
  {
    key: 'efficiency',
    name: {
      zh: '文档获取效率',
      en: 'Document retrieval efficiency',
    },
    value: 0,
    isChange: false,
  },
  {
    key: 'accuracy',
    name: {
      zh: '文档正确性',
      en: 'Document accuracy',
    },
    value: 0,
    isChange: false,
  },
  {
    key: 'completeness',
    name: {
      zh: '文档完整性',
      en: 'Document completeness',
    },
    value: 0,
    isChange: false,
  },
  {
    key: 'usability',
    name: {
      zh: '文档易理解',
      en: 'Document comprehensibility',
    },
    value: 0,
    isChange: false,
  },
]);

// -------------------- 论坛、issues --------------------
const issuebackRef = ref();

const floatData = reactive([
  {
    img: markRaw(IconChat as any),
    id: 'forum',
    text: computed(() => t('feedback.forum')),
    textMb: computed(() => t('feedback.forumHelp')),
    tip: computed(() => t('feedback.forumTip')),
    link: import.meta.env.VITE_SERVICE_FORUM_URL,
  },
  {
    img: computed(() => {
      return isDark.value ? IconQuickIssue_dark : IconQuickIssue_light;
    }),
    id: 'quickIssue',
    text: 'QuickIssue',
    text2: 'Issue',
    textMb: 'QuickIssue',
    tip: computed(() => t('feedback.quickIssueTip')),
    link: `${import.meta.env.VITE_SERVICE_QUICKISSUE_URL}/zh/issues/`,
  },
  {
    img: markRaw(IconFAQ as any),
    id: '',
    text: 'FAQs',
    textMb: 'FAQs',
    tip: '',
    link: `/${locale.value}/docs/common/faq/general/general_faq.html`,
  },
]);

// -------------------- 移动端 --------------------
const scoreMbRef = ref();
const showDocsFeedbackDlg = ref(false);

const floatDataMb = reactive([
  {
    img: markRaw(IconSmile as any),
    id: 'score',
    textMb: computed(() => t('feedback.wantSubmitMark')),
    click: () => {
      showDocsFeedbackDlg.value = true;
    }
  },
  {
    img: markRaw(IconChat as any),
    id: 'forum',
    text: computed(() => t('feedback.forum')),
    textMb: computed(() => t('feedback.forumHelp')),
    tip: computed(() => t('feedback.forumTip')),
    link: import.meta.env.VITE_SERVICE_FORUM_URL,
  },
  {
    img: computed(() => {
      return isDark.value ? IconQuickIssue_dark : IconQuickIssue_light;
    }),
    id: 'quickIssue',
    text: 'QuickIssue',
    text2: 'Issue',
    textMb: 'QuickIssue',
    tip: computed(() => t('feedback.quickIssueTip')),
    link: `${import.meta.env.VITE_SERVICE_QUICKISSUE_URL}/zh/issues/`,
  },
  {
    img: markRaw(IconFAQ as any),
    id: '',
    text: 'FAQs',
    textMb: 'FAQs',
    tip: '',
    link: `/${locale.value}/docs/common/faq/general/general_faq.html`,
  },
]);

const onDocsFeedbackDlgClose = () => {
  showDocsFeedbackDlg.value = false;
  feedbackDocStore.reset();
}

// -------------------- 回到顶部 --------------------
// 页面滚动大于一屏时，显示回到顶部悬浮按钮
const showBackTop = ref(false);
const oscrollerDom = ref();

const listenScroll = () => {
  if (oscrollerDom.value.scrollTop > document.body.clientHeight) {
    showBackTop.value = true;
  } else {
    showBackTop.value = false;
  }
};

onMounted(() => {
  oscrollerDom.value = document.querySelector('#app > .o-scroller > .o-scroller-container');
  oscrollerDom.value?.addEventListener('scroll', listenScroll);
});

onUnmounted(() => {
  oscrollerDom.value?.removeEventListener('scroll', listenScroll);
});
</script>

<template>
  <div v-if="gtPhone" class="feedback">
    <div v-if="nodeStore.currentNode" class="bug-box" @click="docBugVisible = true">
      <div class="bug-text">{{ t('feedback.bugCatching') }}</div>
    </div>
    <div class="feedback-container">
      <div id="tour_feedback" class="container" :class="isDark ? 'dark-box' : ''">
        <OFeedbackDoc
          v-model:efficiency="feedbackDocStore.efficiency"
          v-model:accuracy="feedbackDocStore.accuracy"
          v-model:completeness="feedbackDocStore.completeness"
          v-model:usability="feedbackDocStore.usability"
          v-model:feedback="feedbackDocStore.feedback"
          :submit-data="feedbackDocStore.submitRate"
          :submit-issue="feedbackDocStore.submitIssue"
          @close="feedbackDocStore.reset"
        />

        <ODivider :style="{ '--o-divider-gap': '12px' }" />

        <div class="item-container">
          <OIcon ref="issuebackRef" id="issueback">
            <component :is="IconHeadset"> </component>
          </OIcon>

          <OPopup
            position="left"
            :target="issuebackRef"
            wrapper="#issueback"
            :body-class="`popup-issueback ${locale === 'en' ? 'popup-issueback-en' : ''}`"
            :offset="24"
            trigger="hover"
            :style="{
              top: '22px',
            }"
          >
            <OLink
              v-analytics="{ properties: { target: item.link, type: 'feedback' } }"
              v-for="item in floatData"
              :key="item.link"
              :href="item.link"
              target="_blank"
              class="popup-item"
              :hover-underline="false"
            >
              <OIcon><component :is="item.img"></component> </OIcon>

              <div class="text">
                <p class="text-name">
                  {{ item.text }}
                </p>

                <p v-if="item.tip" class="text-tip">{{ item.tip }}</p>
              </div>
            </OLink>
          </OPopup>
        </div>
      </div>

      <div v-if="showBackTop" class="container back-top" :class="[isDark ? 'dark-box' : '']" @click="scrollToTop(0)">
        <OIcon class="icon-top"><IconTop /> </OIcon>
      </div>
    </div>
  </div>
  <div v-if="isPhone" class="feedback-mb feedback">
    <div class="feedback-wrap-mb">
      <div ref="scoreMbRef" id="feedbackMb" class="tips">
        <OIcon><IconTips /></OIcon>
      </div>
      <OPopup
        position="lb"
        :target="scoreMbRef"
        wrapper="#feedbackMb"
        :body-class="`popup-feedback-mb ${locale === 'en' ? 'popup-feedback-mb-en' : ''}`"
        trigger="click"
      >
        <OLink
          v-for="item in floatDataMb"
          :key="item.id"
          :href="item?.link"
          target="_blank"
          class="feedback-item-mb"
          :hover-underline="false"
          @click="item.click?.()"
        >
          <OIcon><component :is="item.img"></component> </OIcon>
          <p class="text-name">{{ item.textMb }}</p>
        </OLink>
      </OPopup>
    </div>
  </div>

  <!-- 文档捉虫弹窗 -->
  <DocBugDialog v-model="docBugVisible" />

  <!-- 文档反馈弹窗 -->
  <OFeedbackDocDialog
    v-model:visible="showDocsFeedbackDlg"
    v-model:efficiency="feedbackDocStore.efficiency"
    v-model:accuracy="feedbackDocStore.accuracy"
    v-model:completeness="feedbackDocStore.completeness"
    v-model:usability="feedbackDocStore.usability"
    v-model:feedback="feedbackDocStore.feedback"
    :submit-data="feedbackDocStore.submitRate"
    :submit-issue="feedbackDocStore.submitIssue"
    @close="onDocsFeedbackDlgClose"
  />
</template>

<style lang="scss">
.doc-item-tooltip {
  --el-text-color-primary: var(--o-color-fill2);
  --el-bg-color: var(--o-color-info1);
  box-shadow: var(--o-shadow-2);
  min-width: 28px;
  height: auto;
  text-align: center;
  border-radius: var(--o-radius-xs);
  backdrop-filter: blur(5px);

  &::after {
    content: '';
    display: block;
    width: 8px;
    height: 8px;
    transform: rotateZ(45deg);
    border-color: transparent var(--o-color-control4-light) var(--o-color-control4-light) transparent;
    background-color: var(--o-color-fill2);
    position: absolute;
    bottom: -4px;
    right: 9px;
  }
}

.docs-score-dialog {
  .o-dlg-main {
    border-radius: 4px 4px 0 0;
  }
}
</style>
<style lang="scss" scoped>
.o-icon {
  font-size: 24px;
}
.feedback {
  position: fixed;
  bottom: 220px;
  right: max(calc(64px + (var(--vw100) - 1920px) / 2), 64px);
  z-index: 10;
  height: 280px;
  width: 48px;

  @media (min-width: 1441px) and (max-width: 1919px) {
    right: 64px;
  }

  @include respond('<=laptop') {
    right: 40px;
  }

  @include respond('<=pad') {
    right: 32px;
  }

  @include respond('phone') {
    right: 12px;
  }
}

.bug-box {
  width: 100%;
  height: 104px;
  background-image: url(@/assets/category/float/bug-bg.png);
  background-size: 100%;
  margin-bottom: 12px;
  box-shadow: var(--e-shadow-l2);
  user-select: none;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  letter-spacing: 4px;
  cursor: pointer;
}
.bug-box:hover {
  background-image: url(@/assets/category/float/bug-bg-hover.png);
}
.bug-text {
  color: white;
  font-size: 14px;
  writing-mode: vertical-rl;
}

[lang='en'] {
  .bug-text {
    writing-mode: inherit;
    white-space: pre;
  }
}

.feedback-container {
  display: flex;
  flex-direction: column;
  position: relative;
}
.dark-nav {
  border: 1px solid var(--o-color-control4-light);
}

.container {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background-color: var(--o-color-fill2);
  border-radius: var(--o-radius-xs);
  box-shadow: var(--o-shadow-2);
}

.item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--o-color-info1);
  cursor: pointer;

  @include hover {
    color: var(--o-color-primary1);
  }
}
:deep(.o-link-label) {
  display: flex;
  align-items: flex-start;
}
.o-link {
  padding: 0;
}
.o-link:not(:first-child) {
  margin-top: 12px;
}

:deep(.o-popup) {
  cursor: default;

  .popup-item {
    .o-icon {
      font-size: var(--o-font_size-h1);
      color: var(--o-color-info1);
    }
  }

  .popup-issueback {
    padding: 24px;
    background-color: var(--o-color-fill2);
    border-radius: var(--o-radius-s);
    width: 224px;
    position: relative;
    display: flex;
    flex-direction: column;

    .popup-item {
      padding: 0;

      .o-link-main {
        display: flex;
        align-items: flex-start;
        color: var(--o-color-info1);
      }

      @include hover {
        & .text .text-name {
          color: var(--o-color-primary1);
        }
      }

      & ~ .popup-item {
        margin-top: 12px;
      }

      .text {
        margin-left: 8px;
        text-align: left;
        align-self: center;

        .text-name {
          font-size: var(--o-font_size-tip1);
          line-height: 22px;
          font-weight: 600;
          a {
            color: var(--o-color-info1);
          }
        }
        .text-tip {
          font-size: var(--o-font_size-tip2);
          line-height: 18px;
          color: var(--o-color-info2);
          margin-top: 4px;
        }
      }
    }
  }

  .popup-issueback-en {
    width: 332px;
  }
}

.railway {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;

  .title {
    color: var(--o-color-info1);
    text-align: center;
    margin-bottom: 12px;
    @include tip1;
  }

  :deep(.el-slider__bar) {
    background: linear-gradient(270deg, #002fa7 0%, #21a9fc 100%);
  }

  :deep(.el-slider__button) {
    background: var(--o-color-primary1);
    border: solid 5px var(--o-color-white);
  }
}

.submit-btn {
  display: flex;
  justify-content: center;
  .o-link {
    margin-top: 0;
  }
}

.back-top {
  margin-top: 12px;
  color: var(--o-color-info1);
  cursor: pointer;
}

.feedback-mb {
  bottom: 82px;
  height: 48px;
}
.tips {
  padding: 12px;
  background-color: var(--o-color-fill2);
  border-radius: var(--o-radius-xs);
  box-shadow: var(--o-shadow-2);
  cursor: pointer;
  display: flex;
}
:deep(.o-popup) {
  --popup-bd: none;
  .popup-feedback-mb {
    width: 144px;
    padding: 16px;
    background-color: var(--o-color-fill2);
    box-shadow: var(--o-shadow-2);
    border-radius: var(--o-radius-xs);
    position: relative;
  }

  .popup-feedback-mb-en {
    width: 220px;
  }
}
.feedback-item-mb {
  display: flex;
  margin-top: 0;
  @include text2;
  :deep(.o-link-main) {
    display: flex;
    align-items: flex-start;
    color: var(--o-color-info1);
  }
  .text-name {
    color: var(--o-color-info1);
    font-weight: 500;
    margin-left: 8px;
  }
}
.feedback-item-mb + .feedback-item-mb {
  margin-top: 12px;
}

.railway-mb {
  display: flex;
  flex-direction: column;
  align-items: center;
  .title {
    @include text1;
    color: var(--o-color-info2);
  }
  .slider-container {
    width: 100%;
    position: relative;
    margin-top: 24px;
  }
  .rate-stop {
    position: absolute;
    display: flex;
    width: calc(100% - 16px);
    left: 8px;
    top: -28px;
    margin-top: 12px;
    color: var(--o-color-info4);
    height: 16px;
    @include tip1;
  }
  .stop {
    position: absolute;
    width: auto;
    text-align: center;
    transform: translateX(-50%);
    color: var(--o-color-info4);
  }
  .score-container-mb {
    padding: 0 8px;

    :deep(.el-slider__bar) {
      background: linear-gradient(270deg, #002fa7 0%, #21a9fc 100%);
    }

    :deep(.el-slider__button) {
      background: var(--o-color-primary1);
      border: solid 5px var(--o-color-white);
    }
  }
}
.railway-mb + .railway-mb {
  margin-top: 16px;
}
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  .o-btn {
    --btn-bg-color-hover: none;
    --btn-bg-color-active: none;
    --btn-padding: 0 50px;
    --btn-color: var(--o-color-info1);
    font-weight: 500;
  }
}
</style>
