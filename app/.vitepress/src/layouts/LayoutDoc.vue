<script setup lang="ts">
import { onMounted, ref, computed, watch, onUpdated, onUnmounted } from 'vue';
import { useRouter, useData, inBrowser, useRoute } from 'vitepress';
import { storeToRefs } from 'pinia';
import { OIcon, useMessage } from '@opensig/opendesign';

import DocFooter from '@/components/doc/DocFooter.vue';
import DocType from '@/components/doc/DocType.vue';
import DocTypeMobile from '@/components/doc/DocTypeMobile.vue';
import DocVersion from '@/components/doc/DocVersion.vue';
import DocVersionMobile from '@/components/doc/DocVersionMobile.vue';
import DocSearch from '@/components/doc/DocSearch.vue';
import DocMenu from '@/components/doc/DocMenu.vue';
import DocBreadCrumb from '@/components/doc/DocBreadCrumb.vue';
import DocBug from '@/components/doc/DocBug.vue';
import FloatingButtonDocs from '@/components/FloatingButtonDocs.vue';

import TheDocsArticle from '@/views/docs/TheDocsArticle.vue';
import TheDocsNode from '@/views/docs/TheDocsNode.vue';
import TheSearchResult from '@/views/search/TheSearchResult.vue';

import IconExpand from '~icons/app/icon-expand.svg';

import { useLocale } from '@/composables/useLocale';
import { useScreen } from '@/composables/useScreen';
import { useSearchingStore } from '@/stores/common';
import { useNodeStore } from '@/stores/node';
import { useViewStore } from '@/stores/view';

import { getNodeHrefSafely, type DocMenuNodeT } from '@/utils/tree';
import { scrollIntoView } from '@/utils/scroll-to';
import { isElementVisible } from '@/utils/element';
import { getDomId } from '@/utils/common'; 
import { oaReport } from '@/shared/analytics';
import { vAnalytics } from '@/shared/analytics';
import { nextTick } from 'vue';

const { hash, lang } = useData();
const { lePad, isPhone, size } = useScreen();

const router = useRouter();
const route = useRoute();
const viewStore = useViewStore();

// -------------------- 菜单 --------------------
const nodeStore = useNodeStore();
const menuVal = ref('');

const menuExpandedKeys = ref<string[]>([]);
const nodeIndex = ref(0);

watch(
  () => nodeStore.currentNode,
  () => {
    if (nodeStore.currentNode) {
      menuVal.value = nodeStore.currentNode.id;
    }
  }
);

const updateExpandedKeys = () => {
  if (nodeStore.pageNode) {
    const set = new Set([...menuExpandedKeys.value, ...nodeStore.prevNodes.map((item) => item.id)]);
    if (nodeStore.currentNode && nodeStore.currentNode === nodeStore.pageNode) {
      set.add(nodeStore.pageNode.id);
    }

    menuExpandedKeys.value = Array.from(set);

    setTimeout(() => {
      const parent = document.querySelector<HTMLElement>('#menuScrollDom .o-scroller-container');
      const el = document.querySelector<HTMLElement>('#rec-active-menu-item');
      if (parent && el && !isElementVisible(el, parent, 38)) {
        scrollIntoView(el, parent, 100, 200);
      }
    }, 300);
  }
};

watch(lang, () => {
  setTimeout(updateExpandedKeys, 300);
})

onMounted(() => {
  if (nodeStore.currentNode) {
    menuVal.value = nodeStore.currentNode.id;
  }

  updateExpandedKeys();
});

const onPageChange = () => {
  setTimeout(updateExpandedKeys, 300);
};

// 点击菜单跳转文档
const onClickMenuItem = (item: DocMenuNodeT, newOpener?: boolean) => {
  reportMenuClick(item);
  if (item.type !== 'page' && item.type !== 'anchor') {
    return;
  }

  const href = getNodeHrefSafely(item);
  if (href) {
    if (newOpener) {
      window.open(href, '_blank', 'noopener noreferrer');
      return;
    }

    const url = new URL(`${window.location.origin}${href}`);
    if (url.pathname === window.location.pathname && url.hash === window.location.hash) {
      scrollIntoTitle();
      return;
    }

    if (url.pathname === window.location.pathname && url.hash) {
      window.history.replaceState({}, '', url.hash);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      router.go(href);
    }

    if (size.width < 1200) {
      isSidebarHidden.value = true;
    }

    useSearchingStore().isSearching = false;
  }
};

const onClickMenuTitle = (item: DocMenuNodeT) => {
  const id = getDomId(item.label)
  const dom = document.querySelector(`#${id}`);
  if (dom) {
    useSearchingStore().isSearching = false;
    window.history.replaceState({}, '', `#${id}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
};

// 滚动到指定锚点
const scrollIntoTitle = async () => {
  if (viewStore.isScrolling) {
    return;
  }

  viewStore.isScrolling = true;
  if (window.location.hash) {
    const contentDom = document.querySelector('.ly-doc');
    if (contentDom) {
      const hash = decodeURIComponent(window.location.hash);
      const target = contentDom.querySelector<HTMLElement>(`#user-content-${hash.slice(1)}`) || contentDom.querySelector<HTMLElement>(hash) ||  contentDom.querySelector<HTMLElement>(`[name='${hash.slice(1)}']`);
      const scrollContainer = document.querySelector<HTMLElement>('#app > .o-scroller > .o-scroller-container');
      if (target && scrollContainer) {
        await scrollIntoView(target, scrollContainer);
      }
    }
  }

  viewStore.isScrolling = false;
};

onMounted(() => {
  setTimeout(scrollIntoTitle, 300);
});

watch(hash, () => {
  setTimeout(scrollIntoTitle, 100); // 延迟执行，避免切换了scroller位置没有变动导致移动移除
});

const onChangeAnchor = (value: string) => {
  menuVal.value = value;
  if (nodeStore.pageNode && !menuExpandedKeys.value.includes(nodeStore.pageNode.id)) {
    updateExpandedKeys();
  }
};

const onChangeNodeIndex = (value: number) => {
  nodeIndex.value = value;
};

// -------------------- 文档模块menu --------------------
const docsMenu = computed(() => {
  if (viewStore.isOverview) {
    return nodeStore.moduleNode?.children || [];
  }

  return nodeStore.manualNode ? [nodeStore.manualNode] : [];
});

// -------------------- 搜索 --------------------
const searchStore = useSearchingStore();
const { isSearching } = storeToRefs(searchStore);

const version = ref('');
const isSidebarHidden = ref(true);

watch(
  () => route.path,
  (val) => {
    if (val) {
      const sp = val.split('/');
      if (sp.length > 3) {
        version.value = sp[3];
        // 保存当前版本
        searchStore.$patch({
          version: version.value,
        });
      }
    }
  },
  {
    immediate: true,
  }
);

// -------------------- 屏幕小于1200px后，切换是否折叠--------------------
const switchMenu = () => {
  isSidebarHidden.value = !isSidebarHidden.value;
};

// -------------------- 代码块复制 --------------------
const { t } = useLocale();
const message = useMessage();

const popMessage = () => {
  message.success({ content: t('docs.copySuccess') });
};

const copyDoc = () => {
  const buttonCopy = Array.from(document.querySelectorAll('.copy'));
  for (let index = 0; index < buttonCopy.length; index++) {
    buttonCopy[index].addEventListener('click', popMessage);
  }
};

onMounted(() => {
  copyDoc();
});

onUpdated(() => {
  copyDoc();
});

onUnmounted(() => {
  const buttonCopy = Array.from(document.querySelectorAll('.copy'));
  for (let index = 0; index < buttonCopy.length; index++) {
    buttonCopy[index].removeEventListener('click', popMessage);
  }
});

// -------------------- 埋点 --------------------
/**
 * 上报菜单点击事件
 *
 * @param item 菜单项
 */
const reportMenuClick = (item: DocMenuNodeT) => {
  const path = [] as string[];
  while (item?.label) {
    path.unshift(item.label);
    item = item.parent as DocMenuNodeT;
  }
  if (!viewStore.isCommonView) {
    path.unshift(version.value);
  }
  oaReport('click', {
    type: 'menu',
    ...path.reduce(
      (acc, label, index) => {
        acc[`level_${index + 1}`] = label;
        return acc;
      },
      {} as Record<string, string>
    ),
  }, 'docs', { immediate: true });
};

const currentReadingSections = new Set<{ start: HTMLElement; end: HTMLElement | null; startTime: number | null }>();

if (inBrowser) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (viewStore.isOverview) return;
      // 如果当前阅读的章节中有内容,就上报阅读时长
      if (currentReadingSections.size) {
        for (const section of currentReadingSections) {
          if (!section.startTime) continue;
          const duration = Date.now() - section.startTime;
          oaReport('sectionDuration', {
            section: section.start.id,
            duration: duration,
          });
          section.startTime = null;
        }
        currentReadingSections.clear();
      }
      const scrollContainer = document.querySelector<HTMLElement>('.o-scroller-container');
      if (!scrollContainer) return;
      oaReport('scroll', {
        scrollTop: scrollContainer.scrollTop,
        section: menuVal.value.slice(menuVal.value.lastIndexOf('#') + 1),
        path: menuVal.value,
        perentage: ((scrollContainer.scrollTop * 100) / (scrollContainer.scrollHeight - scrollContainer.clientHeight)).toFixed(2) + '%',
      });
    }
  });
}

let obs: IntersectionObserver | null = null;
let sections = [] as { start: HTMLElement; end: HTMLElement | null; startTime: number | null }[];

const updateObserver = () => {
  if (!obs) return;
  obs.disconnect();
  const mdContent = document.querySelector('.doc-body > .markdown-body > div');
  if (!mdContent) return;
  sections = [] as { start: HTMLElement; end: HTMLElement | null; startTime: number | null }[];
  for (const element of mdContent.children) {
    if (element.tagName === 'H2') {
      sections.push({
        start: element as HTMLElement,
        end: null,
        startTime: null,
      });
      continue;
    }
    if (!element.nextElementSibling || element.nextElementSibling.tagName === 'H2') {
      const current = sections[sections.length - 1];
      if (!current) continue;
      current.end = element as HTMLElement;
    }
  }
  if (sections.length === 0) return;
  sections.forEach((section) => {
    obs!.observe(section.start);
    obs!.observe(section.end!);
  });
}

watch(route, () => {
  nextTick(() => {
    updateObserver();
  })
});

onMounted(() => {
  // 滚动时上报文档各个部分停留（阅读）时间
  obs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        // H2作为某个部分的开头，从页面底部出现时开始阅读
        if (entry.isIntersecting && entry.intersectionRatio >= 1 && entry.target.tagName === 'H2') {
          const section = sections.find((section) => section.start === entry.target);
          if (!section) continue;
          currentReadingSections.add(section);
          section.startTime = Date.now();
          continue;
        }
        // H2的前一个元素作为某个部分的结尾，从页面顶部消失时算阅读结束
        if (!entry.isIntersecting && entry.intersectionRatio <= 0 && entry.target.tagName !== 'H2' && entry.boundingClientRect.top < entry.rootBounds!.top) {
          const section = sections.find((section) => section.end === entry.target);
          if (!section || !section.startTime) continue;
          const duration = Date.now() - section.startTime;
          section.startTime = null;
          currentReadingSections.delete(section);
          oaReport('sectionDuration', {
            section: section.start.id,
            duration: duration,
          });
          continue;
        }
        // 当某个H2从页面底部消失，将这一章从“当前正在阅读的章节”中移除
        if (!entry.isIntersecting && entry.intersectionRatio <= 0 && entry.target.tagName === 'H2' && entry.boundingClientRect.top >= window.innerHeight) {
          const section = sections.find((section) => section.start === entry.target);
          if (!section) continue;
          currentReadingSections.delete(section);
        }
      }
    },
    { threshold: [0, 1.0], rootMargin: '-80px 0px 0px 0px' }
  );
  updateObserver();
});

onUnmounted(() => {
  obs?.disconnect();
});
</script>

<template>
  <div class="ly-container">
    <template v-if="docsMenu.length > 0">
      <div v-if="!isPhone" class="doc-sidebar" :class="{ 'is-closed': lePad && isSidebarHidden }">
        <DocType :version="version" @refresh="onPageChange" />
        <DocVersion v-if="!viewStore.isCommonView" :version="version" />
        <DocSearch @switchVisible="isSidebarHidden = true" />
        <DocMenu
          v-analytics.catchBubble="(_: any, data: any) => reportMenuClick(data)"
          v-model="menuVal"
          v-model:expanded="menuExpandedKeys"
          :items="docsMenu"
          :recursion="!viewStore.isOverview"
          :node-index="nodeIndex"
          @click="onClickMenuItem"
          @click-title="onClickMenuTitle"
        />
        <div class="menu-opener" @click="switchMenu">
          <div class="opener-thumb"></div>
        </div>
      </div>
      <div v-if="isPhone" class="doc-sidebar-mb">
        <div class="sidebar-top">
          <div class="menu-opener-mb" :class="{ 'menu-opener-mb-active': !isSidebarHidden }">
            <OIcon class="icon-expand" @click="switchMenu"><IconExpand /></OIcon>
            <DocTypeMobile :version="version" @refresh="onPageChange" />
          </div>
          <DocVersionMobile v-if="!viewStore.isCommonView" :version="version" />
        </div>
      </div>
      <div v-if="isPhone" class="doc-menu-mb" :class="[isSidebarHidden ? 'is-closed' : '']">
        <DocSearch @switchVisible="isSidebarHidden = true" />
        <DocMenu
          v-model="menuVal"
          v-model:expanded="menuExpandedKeys"
          :items="docsMenu"
          :recursion="!viewStore.isOverview"
          :node-index="nodeIndex"
          @click="onClickMenuItem"
          @click-title="onClickMenuTitle"
        />
      </div>
      <div ref="maskRef" class="aside-mask" @click="switchMenu"></div>
    </template>

    <!-- 文档右侧内容 -->
    <div class="ly-doc" :class="{ 'ly-doc-no-menu': !nodeStore.currentNode }">
      <DocBreadCrumb v-if="!isPhone && nodeStore.currentNode" />
      <div class="doc-content">
        <!-- 文档模块总览 -->
        <TheDocsNode v-if="!isSearching && viewStore.isOverview" @change-node-index="onChangeNodeIndex" />
        <!-- 文档内容 -->
        <TheDocsArticle
          v-else-if="!isSearching && !viewStore.isOverview"
          @change-anchor="onChangeAnchor"
          @page-change="onPageChange"
          @update-menu-expaned="updateExpandedKeys"
          @click-hash-link="scrollIntoTitle"
        />
        <!-- 搜索结果 -->
        <TheSearchResult v-else :node="docsMenu" />
      </div>
      <DocFooter />
    </div>

    <!-- 文档选中捉虫 -->
    <DocBug />
    <!-- 右侧悬浮组件 -->
    <FloatingButtonDocs />
  </div>
</template>

<style lang="scss">
.ly-container {
  --layout-doc-content-max-width: 1064px;
  --layout-doc-content-padding: 24px 40px;

  // 菜单左间距
  --layout-doc-menu-offset-left: max(calc(64px + (var(--vw100) - 1920px) / 2), 64px);
  // 菜单宽度
  --layout-doc-menu-width: 272px;
  // 菜单文档间距
  --layout-doc-menu-gap: 32px;
  // 文档左间距
  --layout-doc-offset-left: calc(var(--layout-doc-menu-width) + var(--layout-doc-menu-offset-left) + var(--layout-doc-menu-gap));
  // 文档右间距
  --layout-doc-offset-right: 140px;

  @include respond-to('<=laptop') {
    --layout-doc-content-padding: 24px 40px;
    --layout-doc-menu-offset-left: max(calc(40px + (var(--vw100) - 1920px) / 2), 40px);
    --layout-doc-menu-width: 206px;
    --layout-doc-menu-gap: 24px;
    --layout-doc-offset-right: 112px;
  }

  @include respond-to('<=pad') {
    --layout-doc-content-padding: 12px 40px;
    --layout-doc-menu-offset-left: max(calc(2px + (var(--vw100) - 1920px) / 2), 32px);
    --layout-doc-menu-gap: 32px;
    --layout-doc-offset-left: var(--layout-doc-menu-gap);
    --layout-doc-width: min(1200px, calc(var(--vw100) - var(--layout-doc-menu-offset-left) - var(--layout-doc-offset-right)));
    --layout-doc-offset-right: 92px;
  }
  @include respond-to('phone') {
    --layout-doc-content-padding: 12px;
    --layout-doc-menu-offset-left: max(calc(24px + (var(--vw100) - 1920px) / 2), 24px);
    --layout-doc-menu-gap: 24px;
    --layout-doc-offset-left: var(--layout-doc-menu-gap);
    --layout-doc-width: min(1200px, calc(var(--vw100) - var(--layout-doc-menu-offset-left) * 2));
  }
}
</style>

<style lang="scss" scoped>
.doc-sidebar {
  position: fixed;
  top: var(--layout-header-height);
  z-index: 35;
  bottom: 0;
  left: 0;
  padding-left: var(--layout-doc-menu-offset-left);
  padding-top: var(--layout-doc-padding-top);
  padding-bottom: var(--layout-doc-padding-top);

  :deep(.doc-menu) {
    height: calc(100% - 150px);
  }
}
@include respond-to('<=pad') {
  .doc-sidebar {
    bottom: 0;
    background-color: var(--o-color-fill2);
    padding-left: 24px;
    padding-right: 12px;
    padding-top: 24px;
    padding-bottom: 24px;

    :deep(.doc-menu) {
      height: calc(100% - 124px);

      .o-scroller {
        padding-right: 24px;
      }
    }
  }
}

.menu-opener {
  --thumb-height: 32px;
  --thumb-width: 3px;
  --padding-h: 16px;
  --padding-l: 6px;
  --padding-r: 6px;
  --height: calc(var(--padding-h) * 2 + var(--thumb-height));
  background-color: var(--o-color-fill2);
  cursor: pointer;
  font-size: 24px;
  padding: var(--padding-h);
  padding-left: var(--padding-l);
  padding-right: var(--padding-r);
  position: absolute;
  right: 0;
  top: 50%;
  transform: translate(100%, -50%);
  transition:
    background-color 0.2s linear,
    border-radius 0.5s linear;
  z-index: 5;
  border-radius: 0 var(--o-radius-s) var(--o-radius-s) 0;
  margin-right: 1px;

  @include hover {
    :deep(.opener-thumb) {
      background-color: var(--o-color-primary1);
    }
  }
}
@include respond-to('>pad') {
  .menu-opener {
    display: none;
  }
}
@include respond-to('phone') {
  .menu-opener {
    display: none;
  }
}
.opener-thumb {
  background-color: var(--o-color-info3);
  border-radius: 100px;
  height: var(--thumb-height);
  width: var(--thumb-width);
}
.doc-sidebar.is-closed {
  transform: translate(-100%);
  .menu-opener {
    border-radius: 0 var(--o-radius-s) var(--o-radius-s) 0;
    box-shadow: var(--o-shadow-2);

    @include hover {
      :deep(.opener-thumb) {
        background-color: var(--o-color-primary1);
      }
    }
  }
  & + .aside-mask {
    opacity: 0;
    pointer-events: none;
  }
}
.doc-sidebar.is-closed + .aside-mask {
  opacity: 0;
}

.doc-sidebar-mb {
  width: 100%;
  position: fixed;
  z-index: 35;
  top: var(--layout-header-height);
  left: 0;
}
.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: var(--o-color-fill2);
  box-shadow: var(--o-shadow-2);
}
.menu-opener-mb {
  display: flex;
  align-items: center;
  color: var(--o-color-info1);

  .icon-expand {
    font-size: 24px;
  }
}
.menu-opener-mb-active {
  .o-icon {
    transform: rotate(-180deg);
  }
}
.doc-menu-mb {
  width: 255px;
  height: calc(100% - var(--layout-header-height) - 48px);
  background-color: var(--o-color-fill2);
  padding: 16px 4px 16px 24px;
  position: fixed;
  z-index: 35;
  top: calc(var(--layout-header-height) + 48px);
  left: 0;
}
.doc-menu-mb.is-closed {
  transform: translate(-100%);
  & + .aside-mask {
    opacity: 0;
    pointer-events: none;
  }
}
.doc-menu-mb.is-closed + .aside-mask {
  opacity: 0;
}

.aside-mask {
  background-color: var(--o-color-mask1);
  bottom: 0;
  content: '';
  left: 0;
  opacity: 0;
  pointer-events: none;
  position: fixed;
  right: 0;
  top: 0;
  transition: var(--all-transition);
  z-index: 34;
}
@include respond-to('<=pad') {
  .aside-mask {
    opacity: 1;
    pointer-events: auto;
  }
}

.ly-doc {
  padding-top: var(--layout-doc-padding-top);
  padding-bottom: var(--layout-doc-padding-bottom);
  margin-left: var(--layout-doc-offset-left);
  margin-right: var(--layout-doc-offset-right);
  width: var(--layout-doc-width);
  @include respond-to('phone') {
    padding-top: calc(var(--layout-doc-padding-top) + 40px);
  }
}

.ly-doc-no-menu {
  max-width: var(--layout-content-max-width);
  margin: 0 auto;
}
</style>
