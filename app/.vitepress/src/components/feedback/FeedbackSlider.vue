<script lang="ts" setup>
import { ref, computed, type CSSProperties } from 'vue';
import { OIcon, OTextarea, OButton, useMessage, ODivider } from '@opensig/opendesign';
import { ElSlider } from 'element-plus';

import IconClose from '~icons/app/icon-close.svg';

import { postFeedback } from '@/api/api-feedback';
import { useLocale } from '@/composables/useLocale';
import { useScreen } from '@/composables/useScreen';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const message = useMessage();
const { t } = useLocale();
const { gtPhone, isPhone } = useScreen();

interface MarkT {
  style: CSSProperties;
  label: string;
}

type Marks = Record<number, MarkT | string>;

const marks = computed(() => {
  const temp: Marks = {};
  for (let i = 0; i < 11; i++) {
    temp[i * 10] = String(i);
  }
  return temp;
});

const forumLink = import.meta.env.VITE_SERVICE_FORUM_URL;

const placeholder = computed(() => {
  if (score.value / 10 < 7) {
    return t('feedback.placeholder1');
  } else if (score.value / 10 < 9) {
    return t('feedback.placeholder2');
  } else {
    return t('feedback.placeholder3');
  }
});

const isShow = ref(props.show);
const inputText = ref('');
const score = ref(0);

const scoreTip = computed(() => {
  return score.value / 10;
});
const scorePosition = computed(() => {
  return score.value + '%';
});

const emits = defineEmits<{
  (e: 'input', value: boolean): void;
  (e: 'close', value: boolean): void;
}>();

const showFeedbackInput = () => {
  isShow.value = true;
  emits('input', isShow.value);
};

const closeFeedbackPopup = () => {
  inputText.value = '';
  score.value = 0;
  isShow.value = false;
  emits('close', isShow.value);
};

const submitFeedback = () => {
  const params = {
    feedbackPageUrl: window.location.href,
    feedbackText: inputText.value,
    feedbackValue: score.value / 10,
  };

  postFeedback(params)
    .then((res) => {
      if (res.code === 200) {
        message.success({
          content: t('feedback.feedbackSuccess'),
        });
      } else if (res.code === 429) {
        message.danger({
          content: t('feedback.submitBusy'),
        });
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

  closeFeedbackPopup();
};

// ------------------ 移动端nss评分 -----------------
const RATE_MAX_MB = 10;

const RATE_INDEX = Array(RATE_MAX_MB + 1)
  .fill(0)
  .map((_, index) => index);
</script>
<template>
  <div class="feedback-slider">
    <OIcon v-if="gtPhone" class="icon-close" @click="closeFeedbackPopup"><IconClose /></OIcon>

    <p class="slider-title">
      {{ t('feedback.title1') }}<strong>{{ t('feedback.title2') }}</strong
      >{{ t('feedback.title3') }}
    </p>

    <div class="slider-body">
      <div v-show="isShow && gtPhone" class="slider-tip">
        {{ scoreTip }}
      </div>

      <div v-if="isPhone" class="rate-stop">
        <div v-for="(_, index) in RATE_INDEX" :key="index" class="stop" :style="{ left: `${index * 10}%` }">{{ index }}</div>
      </div>

      <el-slider v-model="score" :step="10" :marks="marks" show-stops :show-tooltip="false" @input="showFeedbackInput" />
    </div>

    <div class="grade-info">
      <span>{{ t('feedback.grade1') }}</span>
      <span>{{ t('feedback.grade2') }}</span>
    </div>

    <div v-show="isShow" class="reason">
      <OTextarea v-model="inputText" :placeholder="placeholder" resize="none" :max-length="500" :input-on-outlimit="false" />
      <p class="more-info">
        <span>{{ t('feedback.moreInfo') }}</span>
        <a :href="forumLink" target="_blank">{{ t('feedback.moreInfo2') }}</a>
        <span>{{ t('feedback.moreInfo3') }}</span>
      </p>
      <div v-if="gtPhone" class="submit-btn">
        <OButton color="primary" size="medium" variant="solid" class="submit" :disabled="!inputText" @click="submitFeedback">
          {{ t('feedback.submit') }}
        </OButton>
      </div>
    </div>
    <div v-if="isPhone" class="btn-box">
      <OButton color="normal" variant="text" size="large" @click="closeFeedbackPopup">{{ t('feedback.cancel') }}</OButton>
      <ODivider class="divider-btn" direction="v" />
      <OButton color="normal" variant="text" size="large" :disabled="!inputText" @click="submitFeedback">{{ t('feedback.confirmTitle') }}</OButton>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.feedback-slider {
  cursor: initial;
}

.slider-title {
  color: var(--o-color-info1);
  padding-right: 12px;
  text-align: center;
  @include tip1;
  @include respond-to('<=pad_v') {
    text-align: center;
    margin-bottom: 12px;
    @include text2;
  }
}

.slider-body {
  padding-top: 28px;
  position: relative;
  z-index: 3;
  @include respond-to('<=pad_v') {
    margin: 0 4px;
  }

  @include respond-to('phone') {
    padding-top: 0;
    margin-top: 36px;
  }

  .slider-tip {
    width: 28px;
    height: 20px;
    text-align: center;
    font-size: var(--o-font_size-tip1);
    line-height: var(--o-line_height-tip2);
    color: var(--o-color-info1);
    background-color: var(--o-color-fill2);
    border-radius: var(--o-radius-xs);
    box-shadow: 0 3px 8px rgba(18, 20, 23, 0.08);
    backdrop-filter: blur(5px);
    border: 1px solid var(--o-color-control4-light);
    position: absolute;
    top: -4px;
    left: v-bind(scorePosition);
    transform: translateX(-50%);
    

    &::after {
      content: '';
      display: block;
      width: 8px;
      height: 8px;
      transform: rotateZ(45deg);
      border: 1px solid #000;
      border-color: transparent var(--o-color-control4-light) var(--o-color-control4-light) transparent;
      background-color: var(--o-color-fill2);
      position: absolute;
      bottom: -4px;
      right: 9px;
      z-index: -1;
    }
  }

  :deep(.el-slider) {
    height: auto;
    height: 10px;

    .el-slider__marks {
      display: none;
    }

    .el-slider__runway {
      height: 8px;
      border-radius: var(--o-radius-xs);
      background-color: var(--o-color-control1-light);
    }

    .el-slider__bar {
      height: 10px;
      background-image: linear-gradient(270deg, #002fa7 0%, #21a9fc 100%);
      top: -1px;
      border-radius: 5px;
    }

    .el-slider__button-wrapper + div {
      position: relative;
      transform: translateY(2px);
      z-index: 2;

      & + div {
        transform: translateY(2px);
        & > .el-slider__stop:nth-of-type(1) {
          transform: translatex(2px);
        }
      }
    }

    .el-slider__stop {
      width: 2px;
      height: 2px;
      background-color: var(--o-color-control2);
      top: 1px;
    }

    .el-slider__marks-stop {
      background-color: var(--o-color-fill2);

      &:nth-last-of-type(1) {
        transform: translateX(-4px);
        background-color: var(--o-color-control2);
      }
    }

    .el-slider__button {
      position: relative;
      border: solid 8px var(--o-color-white);
      box-shadow: var(--o-shadow-2);

      &::after {
        display: block;
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--o-color-primary1);
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
    }
  }
}

.grade-info {
  width: 100%;
  display: flex;
  justify-content: space-between;
  color: var(--o-color-info3);
  margin-top: 12px;
  @include tip2;
  @include respond-to('<=pad_v') {
    padding: 0 3px;
  }
  @include respond-to('phone') {
    margin-top: 8px;
  }
}

.reason {
  margin-top: 16px;

  .o-textarea {
    --textarea-radius-pill: 8px;
    --textarea-bd-color-hover: var(--o-color-primary1);

    width: 100%;
    height: 88px;
    @include tip2;

    :deep(.o_textarea) {
      height: 100%;
    }

    :deep(.o_textarea-wrap) {
      height: 100%;
    }

    :deep(.o_textarea-count) {
      right: 8px;
      bottom: 8px;
    }
  }

  .more-info {
    max-width: 270px;
    color: var(--o-color-info3);
    margin-top: 8px;
    text-align: center;
    @include tip2;
  }

  .submit-btn {
    text-align: center;
    margin-top: 16px;

    :deep(.o-button) {
      padding: 6px 26px;
      font-size: var(--o-font_size-tip1);
      border-radius: var(--o-radius-l);
      border-color: var(--o-color-primary1);
      color: var(--o-color-primary1);

      @include hover {
        border-color: var(--o-color-primary2);
        color: var(--o-color-primary2);
      }
    }

    @include respond-to('<=pad_v') {
      display: flex;
      justify-content: space-evenly;

      .o-btn {
        flex: 1;
        position: relative;
        //color: var(--o-color-info1);
        @include h3;

       /*  &:first-child {
          &::after {
            content: '';
            position: absolute;
            right: 0;
            width: 1px;
            height: 100%;
            background-color: var(--o-color-control1-light);
          }
        } */
      }
    }

    /* .submit {
      padding: 6px 26px;

      @include hover {
        --btn-color-hover: var(--o-color-white);
        --btn-bd-color-hover: var(--o-color-primary1);

        background: var(--o-color-primary1);
      }

      &:active {
        color: var(--o-color-primary2-light);
        border-color: var(--o-color-primary1);
      }
    } */
  }
}

.rate-stop {
  position: absolute;
  display: flex;
  width: calc(100% - 16px);
  left: 0;
  top: -36px;
  margin-top: 12px;
  color: var(--o-color-info4);
  height: 16px;
  @include text2;
  div {
    position: absolute;
  }
}
.btn-box {
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
