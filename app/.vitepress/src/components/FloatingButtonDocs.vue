<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, type CSSProperties, watch } from 'vue';
import { OIcon, OPopup, OLink, ODialog, ODivider, OButton, useMessage } from '@opensig/opendesign';
import { ElSlider } from 'element-plus';

import DocBugDialog from '@/components/doc/DocBugDialog.vue';

import IconSmile from '~icons/footer/icon-smile.svg';
import IconClose from '~icons/app/icon-close.svg';

import IconQuickIssue_light from '~icons/footer/icon-quickissue_light.svg';
import IconQuickIssue_dark from '~icons/footer/icon-quickissue_dark.svg';
import IconChat from '~icons/footer/icon-chat.svg';
import IconHeadset from '~icons/feedback/icon-headset.svg';
import IconFAQ from '~icons/feedback/icon-faq.svg';

import IconTips from '~icons/app/icon-tips.svg';
import IconTop from '~icons/app/icon-top.svg';

import { scrollToTop } from '@/utils/common';

import { useAppearance } from '@/stores/common';
import { useThrottleFn } from '@vueuse/core';
import { useScreen } from '@/composables/useScreen';
import { useLocale } from '@/composables/useLocale';
import { postArticleFeedback, type FeedBackDataT } from '@/api/api-feedback';
import { vAnalytics } from '@/shared/analytics';

const { t, locale } = useLocale();
const { isPhone, gtPhone } = useScreen();
const message = useMessage();

const isDark = computed(() => {
  return useAppearance().theme === 'dark' ? true : false;
});

const docBugVisible = ref(false);

// -------------------- 评分 --------------------
const scoreRef = ref();

const showPopup = ref(false); // 显示评分详细

// 鼠标进入图标区域
const onMouseEnter = () => {
  showPopup.value = true;
};
// 鼠标离开图标区域
const onMouseLeave = () => {
  showPopup.value = false;
};

const closePopup = () => {
  showPopup.value = false;
};

watch(
  () => showPopup.value,
  () => {
    multiRate.forEach((item) => {
      item.value = 0;
      item.isChange = false;
    });
  }
);

const STEP = 1;
const RATE_MAX = 10;

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

interface Mark {
  style: CSSProperties;
  label: string;
}
type Marks = Record<number, Mark | string>;
const marks: Marks = Array(RATE_MAX + 1)
  .fill(0)
  .map((_, i) => i)
  .reduce((acc, cur) => {
    acc[cur] = '';
    return acc;
  }, Object.create(null));

const updateItemScore = () => {
  showPopup.value = true;
};

const updateItemScoreAfter = (index: number) => {
  if (multiRate[index]) {
    multiRate[index].isChange = true;
  }
};

// -------------------- 论坛、issues --------------------
const issuebackRef = ref();

const floatData = reactive([
  {
    img: computed(() => {
      return IconChat;
    }),
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
    img: computed(() => {
      return IconFAQ;
    }),
    id: '',
    text: 'FAQs',
    textMb: 'FAQs',
    tip: '',
    link: `/${locale.value}/docs/common/faq/general/general_faq.html`,
  },
]);

// -------------------- 移动端 --------------------
const scoreMbRef = ref();
const scoreVisible = ref(false);

const STEP_MB = 1;
const RATE_MAX_MB = 10;

const RATE_INDEX = Array(RATE_MAX_MB + 1)
  .fill(0)
  .map((_, index) => index);

const marks_mb: Marks = Array(RATE_MAX_MB + 1)
  .fill(0)
  .map((_, i) => i)
  .reduce((acc, cur) => {
    acc[cur] = '';
    return acc;
  }, Object.create(null));

const floatDataMb = reactive([
  {
    img: computed(() => {
      return IconSmile;
    }),
    id: 'score',
    textMb: t('feedback.wantSubmitMark'),
  },
  ...floatData,
]);

const openScoreDlg = (val: string) => {
  if (val === 'score') {
    scoreVisible.value = true;
  }
};

const change = (visible: boolean) => {
  if (!visible) {
    scoreVisible.value = false;
  }
};

const cancelScore = () => {
  scoreVisible.value = false;
  multiRate.forEach((item) => {
    item.value = 0;
  });
};

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

// -------------------- 提交文档评分 --------------------
const submitArticleFeedback = () => {
  const postData: FeedBackDataT = {
    feedbackPageUrl: window.location.href,
    efficiency: multiRate[0].value,
    accuracy: multiRate[1].value,
    completeness: multiRate[2].value,
    usability: multiRate[3].value,
  };

  postArticleFeedback(postData)
    .then((res) => {
      if (res.code === 200) {
        message.success({
          content: t('feedback.feedbackSuccess'),
        });
        showPopup.value = false;
        cancelScore();
      } else {
        message.danger({
          content: t('feedback.feedbackSubmitFailed'),
        });
      }
    })
    .catch(() => {
      message.danger({
        content: t('feedback.feedbackSubmitFailed'),
      });
    });
};
</script>

<template>
  <div v-if="gtPhone" class="feedback">
    <div class="bug-box" @click="docBugVisible = true">
      <div class="bug-text">{{ t('feedback.bugCatching') }}</div>
    </div>
    <div class="feedback-container">
      <div id="tour_feedback" class="container" :class="isDark ? 'dark-box' : ''">
        <div class="score-container" id="score" @mouseenter="onMouseEnter" @mouseleave="useThrottleFn(onMouseLeave, 300)">
          <div ref="scoreRef" class="item-container">
            <OIcon class="icon-smile">
              <component :is="IconSmile"> </component>
            </OIcon>
          </div>

          <OPopup
            :visible="showPopup"
            position="rb"
            :target="scoreRef"
            wrapper="#score"
            body-class="popup-score"
            :auto-hide="showPopup ? false : true"
            :offset="24"
            trigger="hover"
          >
            <OIcon class="icon-close" @click="closePopup">
              <IconClose />
            </OIcon>

            <div>
              <div v-for="(item, i) in multiRate" :key="i" class="railway">
                <p class="title">{{ item.name[locale] }}</p>
                <ClientOnly>
                  <el-slider
                    v-model="item.value"
                    size="small"
                    :step="STEP"
                    :min="0"
                    :max="10"
                    :marks="marks"
                    show-stops
                    :show-tooltip="true"
                    tooltip-class="doc-item-tooltip"
                    @input="updateItemScore"
                    @change="updateItemScoreAfter(i)"
                  />
                </ClientOnly>
              </div>
              <div class="submit-btn">
                <OLink color="primary" :disabled="multiRate.every((item) => !item.isChange)" @click="submitArticleFeedback">{{ t('feedback.submit') }}</OLink>
              </div>
            </div>
          </OPopup>
        </div>

        <ODivider :style="{ '--o-divider-gap': '12px' }" />

        <div class="item-container">
          <OIcon ref="issuebackRef" id="issueback">
            <component :is="IconHeadset"> </component>
          </OIcon>

          <OPopup position="rb" :target="issuebackRef" wrapper="#issueback" body-class="popup-issueback" :offset="24" trigger="hover">
            <OLink v-analytics="{ properties: { target: item.link, type: 'feedback' } }" v-for="item in floatData" :key="item.link" :href="item.link" target="_blank" class="popup-item">
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
      <OPopup position="rt" :target="scoreMbRef" wrapper="#feedbackMb" body-class="popup-feedback-mb" :style="{ left: '-140px' }" :offset="24" trigger="click">
        <OLink v-for="item in floatDataMb" :key="item.id" :href="item?.link" target="_blank" class="feedback-item-mb" @click="openScoreDlg(item.id)">
          <OIcon><component :is="item.img"></component> </OIcon>
          <p class="text-name">{{ item.textMb }}</p>
        </OLink>
      </OPopup>
    </div>
  </div>
  <!-- 移动端评分弹窗 -->
  <ODialog
    :visible="scoreVisible"
    :phone-half-full="true"
    :style="{ '--dlg-head-padding': '16px 24px 0', '--dlg-body-padding': '24px 24px 16px', '--dlg-padding-body-top': '12px', '--dlg-radius': '4px 4px 0 0' }"
    class="docs-score-dialog"
    @change="change"
  >
    <template #header>
      <div class="title-header">{{ t('feedback.wantSubmitMark') }}</div>
    </template>
    <div class="score-content">
      <div v-for="(item, i) in multiRate" :key="i" class="railway-mb">
        <p class="title">{{ item.name[locale] }}</p>
        <div class="slider-container">
          <div class="rate-stop">
            <div v-for="(_, index) in RATE_INDEX" :key="index" class="stop" :style="{ left: `${index * 10}%` }">{{ index }}</div>
          </div>
          <div class="score-container-mb">
            <el-slider
              v-model="item.value"
              size="small"
              :step="STEP_MB"
              :min="0"
              :max="10"
              :marks="marks_mb"
              show-stops
              :show-tooltip="false"
              @change="updateItemScoreAfter(i)"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="btn">
      <OButton color="normal" variant="text" size="large" @click="cancelScore">{{ t('feedback.cancel') }}</OButton>
      <ODivider class="divider-btn" direction="v" />
      <OButton color="normal" variant="text" size="large" :disabled="multiRate.every((item) => !item.isChange)" @click="submitArticleFeedback">{{
        t('feedback.confirmTitle')
      }}</OButton>
    </div>
  </ODialog>

  <!-- 文档捉虫弹窗 -->
  <DocBugDialog v-model="docBugVisible" />
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
.feedback {
  position: fixed;
  bottom: 200px;
  right: 64px;
  z-index: 10;
  height: 280px;
  width: 48px;

  @include respond-to('<=laptop') {
    right: 40px;
  }

  @include respond-to('<=pad') {
    right: 32px;
  }

  @include respond-to('phone') {
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
  flex-direction: column;
  align-items: center;
}
.o-link {
  padding: 0;
}
.o-link:not(:first-child) {
  margin-top: 12px;
}

:deep(.o-popup) {
  cursor: default;

  .o-popup-wrap {
    box-shadow: none;
  }
  .popup-score {
    padding: 16px 24px;
    background-color: var(--o-color-fill2);
    box-shadow: var(--o-shadow-2);
    border-radius: var(--o-radius-xs);
    --popup-min-width: 315px;
    top: 12px;
    position: relative;

    .icon-close {
      position: absolute;
      top: 12px;
      right: 12px;
      color: var(--o-color-info2);
      cursor: pointer;

      @include h4;
      transition: all var(--o-duration-m1) var(--o-easing-standard-in);

      @include hover {
        transform: rotate(180deg);
        color: var(--o-color-primary1);
      }
    }
  }

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
    box-shadow: var(--o-shadow-2);
    --popup-min-width: 220px;
    position: relative;
    display: flex;
    flex-direction: column;

    .popup-item {
      width: 100%;
      padding: 0;
      .o-link-label {
        align-items: flex-start;
        flex-direction: row;
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
}

.railway {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 16px;

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
  margin-top: 16px;
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
    padding: 16px;
    background-color: var(--o-color-fill2);
    box-shadow: var(--o-shadow-2);
    border-radius: var(--o-radius-xs);
    position: relative;
  }
}
.feedback-item-mb {
  display: flex;
  margin-top: 0;
  @include text2;
  :deep(.o-link-label) {
    flex-direction: row;
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
