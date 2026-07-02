<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import { OInput, OIcon, OFigure, OPopover } from '@opensig/opendesign';
import { useData } from 'vitepress';

import { useAppearance } from '@/stores/common';
import i18n from '@/i18n';
import { useLocale } from '@/composables/useLocale';

import type { SearchRecommendT } from '@/@types/type-search';

import { getPop, getSearchRecommend, getOnestepSearch, imageUpload } from '@/api/api-search';

import useClickOutside from '@/components/hooks/useClickOutside';
import { useScreen } from '@/composables/useScreen';
import { useDebounceFn } from '@vueuse/core';

import IconClose from '~icons/app/icon-close.svg';
import IconSearch from '~icons/app/icon-header-search.svg';
import IconDelete from '~icons/app/icon-header-delete.svg';
import IconDeleteAll from '~icons/app/icon-delete.svg';
import IconBack from '~icons/app/icon-header-back.svg';
import IconImageUpload from '~icons/app/icon-image-upload.svg';
import IconImageClose from '~icons/app/icon-image-close.svg';
import IconImageZoomin from '~icons/app/icon-image-zoomin.svg';

const { lang } = useData();

const searchRef = ref();
const isClickOutside = useClickOutside(searchRef) || false;
const { lePadV } = useScreen();
const { locale } = useLocale();

const emits = defineEmits(['focus-input', 'search-click']);
const isShowDrawer = ref(false);
const searchInput = ref('');

const appearanceStore = useAppearance();
const isDark = computed(() => (appearanceStore.theme === 'dark' ? true : false));

// 搜索事件
async function handleSearchEvent() {
  if (pastedFile.value) {
    if (isUploading.value) {
      await uploadPromise;
    }
    const query = searchInput.value.trim();
    const params = new URLSearchParams();
    if (!uploadedImageUrl.value && !query) return;
    if (uploadedImageUrl.value) params.set('imageUrl', uploadedImageUrl.value);
    if (query) params.set('q', query);
    window.open(
      `${import.meta.env.VITE_MAIN_DOMAIN_URL}/${lang.value}/other/search/?${params.toString()}`,
      '_blank'
    );
    return;
  }

  const input = searchInput.value.trim();
  if (!input) {
    return;
  }

  handleSearch(input);
  window.open(
    `${import.meta.env.VITE_MAIN_DOMAIN_URL}/${lang.value}/other/search/?q=${encodeURIComponent(input)}`,
    '_blank'
  );
}
// 点击热搜标签
type SearchItemClickType = 'history' | 'popular' | 'suggest' | 'onestep';

const onTopSearchItemClick = (val: string, type: SearchItemClickType = 'history') => {
  if (type === 'onestep') {
    const url = /^https?:\/\//.test(val) ? val : `${import.meta.env.VITE_MAIN_DOMAIN_URL}/${lang.value}${val.startsWith('/') ? '' : '/'}${val}`;
    window.open(url, '_blank');
  } else {
    searchInput.value = val;
    handleSearchEvent();
  }
};

const searchValue = computed(() => i18n.global.messages.value[locale.value].header.SEARCH);
// 图片搜索占位符
const currentPlaceholder = computed(() => {
  if (showThumbnail.value) return searchValue.value.PLEACHOLDER_EXTEND;
  if (isShowDrawer.value) return searchValue.value.PLEACHOLDER_IMAGE;
  return searchValue.value.PLEACHOLDER;
});
// 显示/移除搜索框
const isShowBox = ref(false);
const popList = ref<string[]>([]);
const showDrawer = () => {
  //热搜
  appearanceStore.iconMenuShow = false;
  isShowBox.value = true;
  emits('search-click', isShowBox.value);
  isShowDrawer.value = true;
  const params = `lang=${lang.value}`;

  if (popList.value?.length) {
    return;
  }
  getPop(params).then((res) => {
    popList.value = res.obj;
  });
};
// 清空输入框内容（保持搜索框展开状态）
const clearSearchInput = () => {
  searchInput.value = '';
  removeImage();
};

// 关闭搜索框
const closeSearchBox = () => {
  clearSearchInput();
  emits('search-click', isShowBox.value);
  if (!lePadV.value) {
    isShowBox.value = false;
    appearanceStore.iconMenuShow = true;
    isShowDrawer.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', () => {
    if (isClickOutside.value && !lePadV.value && !isPreviewOpen.value && !justClosedPreview.value) {
      closeSearchBox();
    }
  });
});
// ----------------- 联想搜索 -------------------------
const recommendData = ref<SearchRecommendT[]>([]);
const onestepData = ref<SearchRecommendT[]>([]);

const queryGetSearchRecommend = useDebounceFn((val: string) => {
  getSearchRecommend({
    query: val,
  }).then((res) => {
    recommendData.value = res.obj.word;
  });
  getOnestepSearch({
    query: val,
    lang: lang.value,
  }).then((res) => {
    onestepData.value = res.obj.word;
  });
}, 300);

watch(
  () => searchInput.value,
  (val: string) => {
    if (val) {
      queryGetSearchRecommend(val);
    } else {
      recommendData.value = [];
      onestepData.value = [];
    }
  }
);

// ----------------------- 历史搜索记录 -----------------------
const searchHistory = ref<string[]>([]);

const loadSearchHistory = () => {
  // 从 localStorage 加载搜索历史
  const history = localStorage.getItem('search-history');
  if (history) {
    searchHistory.value = JSON.parse(history);
  }
};
loadSearchHistory();
const handleSearch = (searchValue: string) => {
  if (searchValue && Array.isArray(searchHistory.value)) {
    // 添加到历史记录并更新 localStorage
    searchHistory.value.unshift(searchValue);
    searchHistory.value = Array.from(new Set(searchHistory.value)); // 去重
    if (searchHistory.value.length > 6) {
      // 最多保持6条搜集记录
      searchHistory.value.pop();
    }
    localStorage.setItem('search-history', JSON.stringify(searchHistory.value));
  }
};

const deleteHistory = (data: string) => {
  if (!data) {
    localStorage.removeItem('search-history');
    searchHistory.value = [];
  }

  const history = localStorage.getItem('search-history');
  if (history) {
    searchHistory.value = JSON.parse(history).filter((s: string) => s !== data);
    localStorage.setItem('search-history', JSON.stringify(searchHistory.value));
  }
};

const closeSearch = () => {
  searchInput.value = '';
  removeImage();
  isShowBox.value = false;
  appearanceStore.iconMenuShow = true;
  isShowDrawer.value = false;
  emits('search-click', isShowBox.value);
};

// ----------------------- 图片搜索 -----------------------
const pastedImage = ref<string>('');
const pastedFile = ref<File | null>(null);
const showThumbnail = ref(false);
const uploadedImageUrl = ref<string>('');
const isUploading = ref(false);
let uploadPromise: Promise<void> | null = null;
const isPreviewOpen = ref(false);
const justClosedPreview = ref(false);

const highlightText = (text: string) => {
  const keyword = searchInput.value.trim();
  if (!keyword) return [{ text, match: false }];
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts: { text: string; match: boolean }[] = [];
  let lastIndex = 0;
  const regex = new RegExp(escaped, 'gi');
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push({ text: text.slice(lastIndex, m.index), match: false });
    parts.push({ text: m[0], match: true });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), match: false });
  return parts;
};

const onPreviewChange = (visible: boolean) => {
  isPreviewOpen.value = visible;
  if (!visible) {
    justClosedPreview.value = true;
    setTimeout(() => {
      justClosedPreview.value = false;
    }, 100);
  }
};

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        handleImageFile(file);
      }
      break;
    }
  }
};

const removeImage = () => {
  URL.revokeObjectURL(pastedImage.value);
  pastedImage.value = '';
  pastedFile.value = null;
  showThumbnail.value = false;
  uploadedImageUrl.value = '';
};

const fileInputRef = ref<HTMLInputElement>();
const oInputRef = ref();

const handleUploadClick = () => {
  // 重置 value，确保选同一张图片也能触发 change 事件
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
  fileInputRef.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    handleImageFile(file);
    nextTick(() => oInputRef.value?.focus());
  }
};

const handleImageFile = (file: File) => {
  pastedFile.value = file;
  pastedImage.value = URL.createObjectURL(file);
  showThumbnail.value = true;

  uploadedImageUrl.value = '';
  isUploading.value = true;
  uploadPromise = imageUpload({ image: file })
    .then((res) => {
      if (res.status === 200 && res.obj) {
        uploadedImageUrl.value = res.obj;
      }
    })
    .finally(() => {
      isUploading.value = false;
    });
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();

  const file = event.dataTransfer?.files?.[0];
  if (file && file.type.indexOf('image') !== -1) {
    handleImageFile(file);
  }
};
</script>
<template>
  <div class="search-wrapper">
    <div :class="{ search: !lePadV, focus: isShowDrawer && !lePadV }">
      <div ref="searchRef" class="header-search">
        <div :class="{ 'input-focus': isShowDrawer, 'has-image': showThumbnail }" @dragover="handleDragOver" @drop="handleDrop">
          <OIcon v-if="lePadV && isShowDrawer" class="search-icon icon" @click.stop="closeSearch"><IconBack></IconBack></OIcon>
          <div class="search-input-wrapper" :class="{ 'with-image': showThumbnail }">
            <OInput
              ref="oInputRef"
              v-model="searchInput"
              :placeholder="currentPlaceholder"
              @keyup.enter="handleSearchEvent"
              @focus="showDrawer"
              @paste="handlePaste"
              class="normal"
            >
              <template #prefix>
                <OIcon class="icon"><IconSearch></IconSearch></OIcon>
              </template>
              <template v-if="isShowDrawer" #suffix>
                <OPopover v-if="!lePadV" trigger="hover" position="bottom" wrap-class="upload-tooltip-popup">
                  <template #target>
                    <span class="upload-btn">
                      <OIcon class="upload icon" @mousedown.prevent @click="handleUploadClick"><IconImageUpload /></OIcon>
                    </span>
                  </template>
                  {{ searchValue.UPLOAD_TOOLTIP }}
                </OPopover>
                <span v-else class="upload-btn">
                  <OIcon class="upload icon" @mousedown.prevent @click="handleUploadClick"><IconImageUpload /></OIcon>
                </span>
                <OIcon class="icon hover-icon-rotate" @mousedown.prevent @click="clearSearchInput"><IconClose /></OIcon>
              </template>
            </OInput>
            <div v-if="showThumbnail" class="input-image-preview">
              <div class="preview-image-wrapper">
                <OFigure :src="pastedImage" preview alt="" class="preview-image" @preview="onPreviewChange" />
                <div class="preview-zoom-overlay">
                  <OIcon class="preview-zoom-icon"><IconImageZoomin /></OIcon>
                </div>
                <OIcon class="preview-remove" @click.stop="removeImage"><IconImageClose /></OIcon>
              </div>
            </div>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="file-input"
            @change="handleFileSelect"
          />
          <OIcon class="only-icon" @click="showDrawer"><IconSearch></IconSearch></OIcon>
          <span v-if="lePadV && isShowDrawer" class="search-text" @click="handleSearchEvent">{{ searchValue.TEXT }}</span>
        </div>

        <div v-show="isShowDrawer && (!showThumbnail || lePadV)" class="drawer">
          <template v-if="!showThumbnail">
            <template v-if="searchInput">
              <template v-if="onestepData.length">
                <div class="search-recommend search-onestep">
                  <div class="recommend-section-title">{{ searchValue.ONESTEP }}</div>
                  <div
                    v-for="item in onestepData"
                    class="recommend-item"
                    @click="onTopSearchItemClick(item.path as string, 'onestep')"
                    :key="item.key"
                  >
                    <template v-for="part in highlightText(item.key)" :key="part.text + part.match"><span :class="{ 'highlight-keyword': part.match }">{{ part.text }}</span></template>
                    <div class="onestep-tag">{{ item.type }}</div>
                  </div>
                </div>
                <div class="split-line"></div>
              </template>
              <div class="search-recommend">
                <div class="recommend-section-title">{{ searchValue.SUGGEST }}</div>
                <template v-if="recommendData.length">
                  <div
                    v-for="item in recommendData"
                    class="recommend-item"
                    @click="onTopSearchItemClick(item.key, 'suggest')"
                    :key="item.key"
                  >
                    <template v-for="part in highlightText(item.key)" :key="part.text + part.match"><span :class="{ 'highlight-keyword': part.match }">{{ part.text }}</span></template>
                  </div>
                </template>
                <div v-else class="recommend-no-data">{{ searchValue.NO_DATA }}</div>
              </div>
            </template>
            <template v-else>
            <div v-if="searchHistory.length" class="history-container">
              <div class="history-title">
                <span class="title">{{ searchValue.BROWSEHISTORY }}</span>
                <OIcon class="icon" @click.stop="deleteHistory('')">
                  <IconDeleteAll></IconDeleteAll>
                </OIcon>
              </div>
              <div class="history">
                <div v-for="item in searchHistory" class="history-item" :class="{ dark: isDark }" @click="onTopSearchItemClick(item)" :key="item">
                  <span class="history-text">{{ item }}</span>
                  <OIcon class="icon-container" @click.stop="deleteHistory(item)"><IconDelete class="icon delete-icon"></IconDelete></OIcon>
                </div>
              </div>
              <div class="split-line"></div>
            </div>
            <div class="hots">
              <div class="hots-title">
                <p>{{ searchValue.TOPSEARCH }}</p>
              </div>
              <div class="hots-list">
                <div v-for="item in popList" :key="item" type="text" class="hots-list-item" @click="onTopSearchItemClick(item)">
                  {{ item }}
                </div>
              </div>
            </div>
            </template>
          </template>
        </div>
      </div>
      <OIcon @click="showDrawer" class="icon search-icon"><IconSearch></IconSearch></OIcon>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.icon {
  cursor: pointer;
  @include h4;
  color: var(--o-color-info1);

  svg {
    width: 20px;
    height: 20px;
  }
}

.delete-icon {
  color: var(--o-color-white);
}

.search-icon {
  color: var(--o-color-info1);
}

.search-wrapper {
  position: relative;

  .search {
    position: absolute;
    right: 0;
    top: -16px;
    background-color: var(--o-color-fill2);
    z-index: 100;

    &.focus {
      top: -32px;
      border-radius: 4px;
    }
  }
}

.header-search {
  position: relative;
  display: flex;
  .o-input {
    width: 160px;
    height: 32px;
    transition: width 0.3s;
    transform: translate(0);
    @include respond('<=laptop') {
      width: 120px;
    }
    @include respond('<=pad_v') {
      display: none;
    }
  }
  @include respond('<=pad_v') {
    margin-left: 0;
    z-index: 2;
    position: fixed;
    width: calc(100vw - 32px);
    left: 16px;
    right: 16px;
    top: 10px;
  }

  .normal {
    :deep(.o-input-wrap) {
      --input-bd-color-hover: var(--o-color-primary1);
    }
  }

  .input-focus {
    padding: var(--o-gap-4);
    border-radius: 4px 4px 0 0;
    display: flex;
    &::after {
      content: '';
      position: absolute;
      height: var(--o-gap-4);
      left: 0;
      bottom: 0;
      width: 100%;
      background-color: var(--o-color-fill2);
      z-index: 200;

      @include respond('<=pad_v') {
        display: none;
      }
    }

    &.has-image::after {
      display: none;
    }

    .search-text {
      color: var(--o-color-info1);
      white-space: nowrap;
      @include h3;
    }

    @include respond('<=pad_v') {
      padding: 0;
      z-index: 200;
      background-color: var(--o-color-fill2);
      width: 100%;
      gap: var(--o-gap-4);
      align-items: center;
    }

    .normal {
      display: flex !important;
    }
    .only-icon {
      display: none !important;
    }
  }

  .drawer {
    position: absolute;
    left: 0px;
    top: 64px;
    height: auto;
    overflow: hidden;
    width: 100%;

    box-shadow: var(--o-shadow-2);
    backdrop-filter: blur(5px);
    padding: var(--o-gap-5);
    padding-top: 0;
    background: var(--o-color-fill2);
    border-radius: 0 0 4px 4px;

    @include respond('<=pad_v') {
      backdrop-filter: blur(0px);
      left: -16px;
      right: 0;
      width: 100vw;
      height: 100vh;
      padding: var(--o-gap-4);
      border-radius: unset;
      top: 32px;
    }

    .hots {
      .hots-title {
        @include tip2;
        color: var(--o-color-info3);

        @include respond('<=pad_v') {
          @include text2;
          margin-bottom: var(--o-gap-3);
        }
      }
      .hots-list {
        display: flex;
        flex-wrap: wrap;
        @include tip2;
        .hots-list-item {
          margin-top: var(--o-gap-3);
          margin-right: var(--o-gap-4);
          color: var(--o-color-info1);
          cursor: pointer;
          @include hover {
            color: var(--o-color-primary1);
          }
        }

        @include respond('<=pad_v') {
          @include text1;
          display: block;
        }
      }
    }

    @include respond('<=pad_v') {
      box-shadow: unset;
      padding-left: var(--o-gap-5);
      padding-right: var(--o-gap-5);
    }
  }
  .normal {
    @media (min-width: 841px) and (max-width: 1000px) {
      display: none;
    }
  }
  .only-icon {
    display: none;

    @media (min-width: 841px) and (max-width: 1000px) {
      display: block;
      color: var(--o-color-info1);
      padding-top: var(--o-gap-1);
      cursor: pointer;
      font-size: var(--o-icon_size-s);
    }
  }
}

.history-container {
  .title {
    @include tip2;
    color: var(--o-color-info3);

    @include respond('<=pad_v') {
      @include text2;
      color: var(--o-color-info1);
    }
  }
  .history-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .history {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    .history-item {
      cursor: pointer;
      background-color: var(--o-color-fill3);
      border-radius: var(--o-radius-xs);
      margin-top: var(--o-gap-2);
      height: 24px;
      max-width: 224px;
      display: flex;
      align-items: center;
      padding: 0 var(--o-gap-3);
      position: relative;
      color: var(--o-color-info1);

      .icon-container {
        display: none;
      }

      @include hover {
        background-color: var(--o-color-control2-light);
        color: var(--o-color-primary1);

        .icon-container {
          display: flex;
          justify-content: center;
          align-items: center;
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: rgb(var(--o-grey-9));
          right: -8px;
          top: -8px;
        }
      }

      .icon {
        height: 16px;
        width: 16px;
      }

      &.dark {
        @include hover {
          background-color: rgb(var(--o-grey-7));
        }
      }

      .history-text {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        @include tip2;

        @include respond('<=pad_v') {
          @include text1;
        }
      }

      @include respond('<=pad_v') {
        height: 28px;
      }
    }
  }
  .split-line {
    background: var(--o-color-control4);
    width: 100%;
    height: 1px;
    margin: var(--o-gap-4) 0;

    @include respond('<=pad_v') {
      display: none;
    }
  }
  @include respond('<=pad_v') {
    margin-bottom: var(--o-gap-5);
  }
}
.split-line {
  background: var(--o-color-control4);
  width: 100%;
  height: 1px;
  margin: var(--o-gap-4) 0;
}
.search-onestep {
  margin-bottom: var(--o-gap-3);
}
.search-recommend {
  .recommend-section-title {
    @include tip1;
    color: var(--o-color-info3);
    margin-bottom: var(--o-gap-3);
    font-weight: 400;

    @include respond-to('<=pad_v') {
      @include text2;
    }
  }

  .recommend-item {
    @include tip1;
    padding: 5px 8px;
    cursor: pointer;
    color: var(--o-color-info1);
    border-radius: 4px;

    &:hover {
      background-color: var(--o-color-control2-light);
    }

    &:active {
      background-color: var(--o-color-control3-light);
    }

    @include respond('<=pad_v') {
      @include text2;
    }

    .onestep-tag {
      @include tip2;
      height: 20px;
      display: inline;
      padding: 1px 8px;
      border-radius: 4px;
      font-weight: 400;
      margin-left: 8px;
      border: 1px solid var(--o-color-control4);
    }

    .highlight-keyword {
      color: var(--o-color-primary1);
      font-weight: 600;
    }
  }

  .recommend-no-data {
    @include tip2;
    color: var(--o-color-info3);

    @include respond-to('<=pad_v') {
      @include text1;
    }
  }
}
.search-icon {
  display: none;
  @include respond('<=pad_v') {
    display: block;
    margin-right: 8px;
  }

  &.icon {
    font-size: var(--o-icon_size-s);
    height: var(--o-icon_size-s);
    svg {
      width: var(--o-icon_size-s);
      height: var(--o-icon_size-s);
    }
  }
}
.input-focus {
  box-shadow: var(--o-shadow-2);
  .o-input {
    display: flex;
    width: 480px;

    @media (max-width: 1440px) {
      width: 240px;
    }

    @include respond('<=pad_v') {
      width: 100%;
      :deep(.el-input__wrapper) {
        width: 100%;
      }
    }
  }
  @include respond('<=pad_v') {
    box-shadow: unset;
  }
}

:deep(.o-input.el-input .el-input__wrapper) {
  border-radius: var(--o-radius-xs);

  &.is-focus {
    border: 1px solid var(--o-color-primary1);
    box-shadow: unset;
  }
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid transparent;
  border-radius: var(--o-radius-xs);
  transition: border-color 0.2s;

  &.with-image {
    border-color: var(--o-color-primary1);

    :deep(.o_box-main) {
      border: none !important;
      box-shadow: none !important;
      border-radius: var(--o-radius-xs) var(--o-radius-xs) 0 0;
    }

    .input-image-preview {
      margin-top: 8px;
    }
  }
}

.input-image-preview {
  padding: 0 12px 8px;

  .preview-image-wrapper {
    position: relative;
    display: inline-flex;
    overflow: visible;

    @include hover {
      .preview-remove {
        opacity: 1;
      }
      .preview-zoom-overlay {
        opacity: 1;
      }
    }
  }

  .preview-zoom-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;

    .preview-zoom-icon {
      color: #fff;
      font-size: 24px;
    }
  }

  .preview-image {
    height: 72px;
    width: 72px;
    border-radius: 4px;
    overflow: hidden;

    :deep(img) {
      height: 72px;
      width: 72px;
      object-fit: cover;
      object-position: center;
      border-radius: 4px;
    }
  }

  .preview-remove {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 16px;
    height: 16px;
    display: flex !important;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    z-index: 1;
    transition: opacity 0.2s;

    :deep(svg) {
      width: 16px;
      height: 16px;
      fill: rgb(var(--o-grey-9));
    }
  }
}

.file-input {
  display: none;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-right: 4px;
  cursor: pointer;
  flex-shrink: 0;

  @include hover {
    background-color: var(--o-color-control2-light);

    .upload.icon {
      color: var(--o-color-primary2);
    }
  }
}

.icon.upload {
  color: var(--o-color-info1);
}
</style>
<style lang="scss">
.upload-tooltip-popup {
  @include tip2;
  padding: var(--o-gap-3) var(--o-gap-4);
  max-width: 240px;
}
</style>
