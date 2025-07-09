<script setup lang="ts">
import { ref } from 'vue';
import { useData } from 'vitepress';
import { OPopover, OIcon, useMessage } from '@opensig/opendesign';

import IconLink from '~icons/app/icon-link.svg';
import IconPin from '~icons/app/icon-pin.svg';

import { useClipboard } from '@/composables/useClipboard';
import { useScreen } from '@/composables/useScreen';
import { useLocale } from '@/composables/useLocale';
import { scrollIntoView } from '@/utils/scroll-to';

const props = defineProps({
  // 标签标题
  titleId: {
    type: String,
    default: '',
  },
});

defineEmits<{
  (e: 'scroll-into-title'): void;
}>();

const message = useMessage();
const { isPhone } = useScreen();
const { hash } = useData();
const { t } = useLocale();
const showPin = ref(false);

const onMouseEnter = () => {
  showPin.value = !isPhone.value;
};

const onMouseLeave = () => {
  showPin.value = false;
};

const onClickAnchor = () => {
  if (`#${props.titleId}` === decodeURIComponent(hash.value)) {
    const contentDom = document.querySelector('.ly-doc');
    if (contentDom) {
      const hash = decodeURIComponent(window.location.hash);
      const target = contentDom.querySelector<HTMLElement>(hash) || contentDom.querySelector<HTMLElement>(`[name='${hash.slice(1)}']`);
      const scrollContainer = document.querySelector<HTMLElement>('#app > .o-scroller > .o-scroller-container');
      if (target && scrollContainer) {
        scrollIntoView(target, scrollContainer);
      }
    }
  } else {
    window.history.replaceState({}, '', `#${props.titleId}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
};

const onClickCopyLink = (e: MouseEvent) => {
  useClipboard({
    text: `${window.location.origin}${window.location.pathname}#${props.titleId}`,
    target: e,
    success: () => {
      message.success({
        content: t('docs.copySuccess'),
      });
    },
  });
};
</script>

<template>
  <span class="title-wrap">
    <span @mouseenter="onMouseEnter" @mouseleave="onMouseLeave" @click="onClickAnchor">
      <transition name="fade">
        <OIcon class="pin" :class="{ 'pin-show': showPin }"> <IconPin /> </OIcon>
      </transition>
      <slot></slot>
    </span>
    <OPopover position="right" trigger="hover" wrap-class="popover-copy">
      <template #target>
        <a class="link copy-link" @click="onClickCopyLink">
          <OIcon> <IconLink /> </OIcon>
        </a>
      </template>

      Copy link
    </OPopover>
  </span>
</template>

<style lang="scss" scoped>
.title-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;

  span {
    display: inline-flex;
  }

  .o-icon {
    @include h2;

    svg {
      width: 24px;
      height: 24px;

      @include respond-to('laptop') {
        width: 20px;
        height: 20px;
      }
      @include respond-to('pad_h') {
        width: 18px;
        height: 18px;
      }
      @include respond-to('pad_v') {
        width: 18px;
        height: 18px;
      }
      @include respond-to('phone') {
        width: 16px;
        height: 16px;
      }
    }
  }

  .link {
    display: inline-flex;
    align-items: center;

    @include hover {
      color: var(--o-color-primary1);
    }
  }

  .copy-link {
    margin-left: 6px;

    @include respond-to('<=laptop') {
      margin-left: 4px;
    }
  }

  .pin {
    position: absolute;
    left: -28px;
    top: 50%;
    transform: translateY(-50%);
    padding-right: 4px;
    transition: opacity var(--o-duration-l) var(--o-easing-standard-in);
    opacity: 0;

    @include respond-to('laptop') {
      left: -22px;
      padding-right: 2px;
    }
    @include respond-to('pad_h') {
      left: -20px;
      padding-right: 2px;
    }
    @include respond-to('pad_v') {
      left: -20px;
      padding-right: 2px;
    }
    @include respond-to('phone') {
      display: none;
    }
  }

  .pin-show {
    opacity: 1;
  }
}
</style>

<style lang="scss">
[data-o-theme='dark'] {
  .popover-copy {
    --popup-bg-color: var(--o-color-control1-light);
  }
}
</style>
