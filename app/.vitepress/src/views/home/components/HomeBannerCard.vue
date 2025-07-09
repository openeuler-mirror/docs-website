<script setup lang="ts">
import { OCard, OFigure } from '@opensig/opendesign';

defineProps({
  title: {
    type: String,
    default: '',
  },
  desc: {
    type: String,
    default: '',
  },
  bg: {
    type: String,
    default: '',
  },
  href: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <OCard hoverable :href="href" class="banner-card-item" target="_blank" rel="noopener noreferrer">
    <OFigure :src="bg">
      <div class="banner-card-title">{{ title }}</div>
      <div class="banner-card-desc">{{ desc }}</div>
    </OFigure>
  </OCard>
</template>

<style lang="scss" scoped>
.banner-card-item {
  --card-main-padding: 0 !important;
  --card-bg-color: transparent;
  cursor: pointer;
}

:deep(.o-figure) {
  width: 100%;
  height: 110px;
  border-radius: var(--o-radius-xs);

  @include respond-to('<=laptop') {
    height: 102px;
  }

  @include respond-to('<=pad') {
    height: 86px;
  }

  .o-figure-main {
    padding: 24px;

    @include respond-to('<=laptop') {
      padding: 16px;
    }

    @include respond-to('<=pad') {
      padding: 12px;
    }
  }
}

.banner-card-title {
  color: rgba(var(--o-white), 1);
  font-weight: 500;
  @include text-truncate(1);
  @include h2;
}

.banner-card-desc {
  color: rgba(var(--o-white), 1);
  margin-top: 8px;
  @include tip1;

  @include respond-to('<=laptop') {
    @include text1;
  }

  @include respond-to('<=pad') {
    @include tip1;
  }
}

[lang='en'] {
  .o-figure {
    height: 130px;

    @include respond-to('<=pad') {
      height: 110px;
    }
  }
}
</style>
