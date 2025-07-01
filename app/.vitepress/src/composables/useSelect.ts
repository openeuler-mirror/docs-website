import { computed, onMounted, onUnmounted, ref } from 'vue';
import { inBrowser } from 'vitepress';

const useSelect = (selector: string) => {
  const start = ref([0, 0]); // 鼠标开始位置
  const end = ref([0, 0]); // 鼠标结束位置
  const visible = ref(false); // 是否展示菜单
  const selectionText = ref(); // 选中的内容

  const x = computed<number>(() => (start.value[0] + end.value[0]) / 2);
  const y = computed<number>(() => {
    if (scrollY.value) {
      return scrollY.value;
    }
    return Math.min(start.value[1], end.value[1]) - 12;
  });

  const mouseDown = (e: MouseEvent) => {
    start.value = [e.x, e.y];
    visible.value = false;
  };
  const mouseUp = (e: MouseEvent) => {
    end.value = [e.x, e.y];
    selectionText.value = window.getSelection()?.toString();
    visible.value = !!selectionText.value?.length && (start.value[0] !== end.value[0] || start.value[1] !== end.value[1]);
    scrollY.value = 0;
  };

  const scrollTop = ref(0); // 当前已滚动距离
  const scrollY = ref(0); // 滚动时popover的位置

  const scroll = ({ target }: { target: HTMLElement } & any) => {
    if (visible.value) {
      scrollY.value = y.value - target.scrollTop + scrollTop.value;
    }
    scrollTop.value = target.scrollTop;
  };

  const addEventListener = () => {
    const ele = document.querySelector(selector) as HTMLElement;
    if (ele) {
      ele.addEventListener('mousedown', mouseDown);
      ele.addEventListener('mouseup', mouseUp);
      const scrollWrapper = document.querySelector('#app > .o-scroller > .o-scroller-container') as HTMLElement;
      if (scrollWrapper) {
        scrollWrapper.addEventListener('scroll', scroll);
      }
    } else {
      requestIdleCallback(addEventListener);
    }
  };

  onMounted(() => {
    if (!inBrowser) return;
    addEventListener();
  });

  onUnmounted(() => {
    if (!inBrowser) return;
    const ele = document.querySelector(selector) as HTMLElement;
    if (!ele) return;
    ele?.removeEventListener('mousedown', mouseDown);
    ele?.removeEventListener('mouseup', mouseUp);
    const scrollWrapper = document.querySelector('#app > .o-scroller > .o-scroller-container');
    if (scrollWrapper) {
      scrollWrapper.removeEventListener('scroll', scroll);
    }
  });

  return {
    x,
    y,
    visible,
    selectionText,
  };
};

export default useSelect;
