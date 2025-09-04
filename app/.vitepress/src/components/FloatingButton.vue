<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { OIcon, ODialog } from '@opensig/opendesign';

import FloatingButtonHome from '@/components/feedback/FloatingButtonHome.vue';
import FeedbackSlider from '@/components/feedback/FeedbackSlider.vue';

import IconTop from '~icons/app/icon-top.svg';
import IconSmile from '~icons/footer/icon-smile.svg';
import IconClose from '~icons/app/icon-close.svg';

import { scrollToTop } from '@/utils/common';

import { useAppearance } from '@/stores/common';
import { useScreen } from '@/composables/useScreen';
import { useLocale } from '@/composables/useLocale';

const { gtPhone, isPhone } = useScreen();
const { t } = useLocale();

const isDark = computed(() => {
  return useAppearance().theme === 'dark' ? true : false;
});

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

// ------------------ 移动端nss评分 -----------------
const isShow = ref(false);

const dialogVisible = ref(false);
const isShowFeedbackMb = ref(false);

const toggleDialogVisible = () => {
  dialogVisible.value = true;
};

const closeFeedbackMb = () => {
  isShowFeedbackMb.value = false;
};

const change = (visible: boolean) => {
  if (!visible) {
    dialogVisible.value = false;
  }
};

onMounted(() => {
  isShowFeedbackMb.value = true;
});
</script>

<template>
  <div v-if="gtPhone" class="feedback-home">
    <div class="feedback-wrap">
      <FloatingButtonHome />
      <div v-if="showBackTop" class="container back-top" :class="[isDark ? 'dark-nav' : '']" @click="scrollToTop(0)">
        <OIcon class="icon-top"><IconTop /> </OIcon>
      </div>
    </div>
  </div>
  <div v-if="isPhone && isShowFeedbackMb" class="feedback-mb">
    <div class="feedback-mb-head">
      <div class="head-title" @click="toggleDialogVisible">
        <OIcon class="icon-box"><component :is="IconSmile"></component> </OIcon>
        <p>
          {{ t('feedback.title1') }}<span class="title-name">{{ t('feedback.title2') }}</span
          >{{ t('feedback.title3') }}
        </p>
      </div>
      <OIcon class="icon-box icon-close" @click="closeFeedbackMb"><component :is="IconClose"></component> </OIcon>
    </div>

    <ODialog
      :visible="dialogVisible"
      :phone-half-full="true"
      :style="{ '--dlg-head-padding': '16px 24px 0', '--dlg-body-padding': '24px 24px 16px', '--dlg-padding-body-top': '12px', '--dlg-radius': '4px 4px 0 0' }"
      :scroller="false"
      @change="change"
    >
      <FeedbackSlider :show="isShow" @close="change" />
    </ODialog>
  </div>
</template>

<style lang="scss" scoped>
.feedback-home {
  position: fixed;
  bottom: 200px;
  right: 64px;
  z-index: 10;
  height: 164px;

  @include respond-to('<=laptop') {
    right: 24px;
  }
}
.dark-nav {
  border: 1px solid var(--o-color-control4-light);
}
.feedback-wrap {
  display: flex;
  flex-direction: column;
  position: relative;
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

.feedback-mb {
  position: sticky;
  bottom: 16px;
  z-index: 11;
  width: 100%;
  margin-bottom: 16px;
  padding: 0 24px;
}
.feedback-mb-head {
  height: 40px;
  padding: 8px;
  background: linear-gradient(90deg, var(--o-color-control2-light) 0%, var(--o-color-control3-light) 100%);
  border-radius: var(--o-radius-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  .o-icon {
    font-size: 16px;
  }
  .icon-close {
    position: absolute;
    right: 12px;
    top: 50%;
    cursor: pointer;
    transform: translateY(-50%);
    transition: all 0.25s cubic-bezier(0, 0, 0, 1);

    @include hover {
      transform: translateY(-50%) rotate(180deg);
      color: var(--o-color-primary1);
    }
  }
  .head-title {
    display: flex;
    align-items: center;
    white-space: nowrap;
    @include text1;
    .title-name {
      font-weight: 500;
    }
    .o-icon {
      margin-right: 8px;
      color: var(--o-color-primary1);
    }
  }
}

.container {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background-color: var(--o-color-fill2);
  border-radius: var(--o-radius-xs);
  box-shadow: var(--o-shadow-2);
}

.back-top {
  margin-top: 12px;
  color: var(--o-color-info1);
  cursor: pointer;
}

.icon-top {
  font-size: var(--o-font_size-h2);
}
</style>
