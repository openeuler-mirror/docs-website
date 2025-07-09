<script setup lang="ts">
import { ref, computed } from 'vue';
import { OIcon, OPopup, ODivider, OLink } from '@opensig/opendesign';

import IconSmile from '~icons/footer/icon-smile.svg';
import IconHeadset from '~icons/feedback/icon-headset.svg';
import IconQuickIssue_light from '~icons/footer/icon-quickissue_light.svg';
import IconQuickIssue_dark from '~icons/footer/icon-quickissue_dark.svg';
import IconChat from '~icons/footer/icon-chat.svg';
import IconFAQ from '~icons/feedback/icon-faq.svg';

import FeedbackSlider from '@/components/feedback/FeedbackSlider.vue';

import { useLocale } from '@/composables/useLocale';

import { useAppearance } from '@/stores/common';
import { useThrottleFn } from '@vueuse/core';

const { t, locale } = useLocale();

const isDark = computed(() => {
  return useAppearance().theme === 'dark' ? true : false;
});

// -------------------- 文档满意度 --------------------
const feedbackRef = ref();
const showPopup = ref(false); // 显示满意度调研弹窗
const showInput = ref(false); // 显示弹窗中输入框
// 鼠标进入图标区域
const onMouseEnter = () => {
  showPopup.value = true;
};
// 鼠标离开图标区域
const onMouseLeave = () => {
  showPopup.value = false;
};
// 滑动滑块
const changeSlider = (v: boolean) => {
  showInput.value = v;
};
// 关闭弹窗
const closeFeedbackPopup = (v: boolean) => {
  showInput.value = v;
  showPopup.value = v;
};

// -------------------- 文档反馈 --------------------
const issuebackRef = ref();

const floatData = ref([
  {
    img: computed(() => {
      return IconChat;
    }),
    id: 'forum',
    text: t('feedback.forum'),
    textMb: t('feedback.forumHelp'),
    tip: t('feedback.forumTip'),
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
    tip: t('feedback.quickIssueTip'),
    link: `${import.meta.env.VITE_SERVICE_QUICKISSUE_URL}/zh/issues/`,
  },
  {
    img: computed(() => {
      return IconFAQ;
    }),
    id: '',
    text: 'FAQs',
    tip: '',
    link: `/${locale.value}/docs/common/faq/general/general_faq.html`,
  },
]);
</script>

<template>
  <div class="nav-box" :class="isDark ? 'dark-nav' : ''">
    <div class="nav-item" id="feedback" @mouseenter="onMouseEnter" @mouseleave="useThrottleFn(onMouseLeave, 300)">
      <OIcon ref="feedbackRef" class="icon-smile">
        <component :is="IconSmile"> </component>
      </OIcon>

      <OPopup
        :visible="showPopup"
        position="rb"
        :target="feedbackRef"
        :auto-hide="showInput ? false : true"
        wrapper="#feedback"
        body-class="popup-feedback"
        :offset="24"
        trigger="hover"
      >
        <FeedbackSlider :show="showInput" @close="closeFeedbackPopup" @input="changeSlider" />
      </OPopup>
    </div>

    <ODivider :style="{ '--o-divider-gap': '12px' }" />

    <div class="nav-item">
      <OIcon ref="issuebackRef" id="issueback">
        <component :is="IconHeadset"> </component>
      </OIcon>

      <OPopup position="rb" :target="issuebackRef" wrapper="#issueback" body-class="popup-issueback" :offset="24" trigger="hover">
        <OLink v-for="item in floatData" :key="item.link" :href="item.link" target="_blank" class="popup-item">
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
</template>

<style lang="scss" scoped>
.nav-box {
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  background-color: var(--o-color-fill2);
  border-radius: var(--o-radius-xs);
  box-shadow: var(--o-shadow-2);
}
.nav-item {
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

:deep(.o-popup) {
  cursor: default;

  .o-popup-wrap {
    box-shadow: none;
  }

  .popup-feedback {
    padding: 16px 30px;
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
</style>
