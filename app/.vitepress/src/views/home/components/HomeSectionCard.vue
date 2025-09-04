<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { OIcon, OCard } from '@opensig/opendesign';
import { request } from '@/shared/axios';

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  desc: {
    type: String,
    default: '',
  },
  href: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  bg: {
    type: String,
    default: '',
  },
});

const svg = ref('');

const getSvg = async () => {
  try {
    const res = await request.get(props.icon);
    svg.value = res.data;
  } catch {
    // nothing
  }
};

onMounted(() => {
  if (props.icon) {
    getSvg();
  }
});
</script>

<template>
  <OCard
    hoverable
    :detail="desc"
    :detail-row="icon ? 2 : 3"
    :detail-max-row="icon ? 2 : 3"
    class="section-card"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
  >
    <template #header>
      <OIcon v-if="svg" class="section-icon" v-dompurify-html="svg" />
      <div class="section-title" :class="{ 'section-no-icon': !icon }">{{ title }}</div>
    </template>

    <img v-if="bg" :src="bg" class="section-bg-icon" />
  </OCard>
</template>

<style lang="scss" scoped>
.section-card {
  --card-main-padding: 24px;
  --card-content-text-size: var(--o-font_size-tip1);
  --card-content-text-height: var(--o-line_height-tip1);
  cursor: pointer;

  @include respond-to('<=pad') {
    --card-main-padding: 12px 16px;
    --card-content-text-size: var(--o-font_size-tip2) !important;
    --card-content-text-height: var(--o-line_height-tip2) !important;
  }

  @include respond-to('phone') {
    --card-main-padding: 12px;
  }

  @include hover {
    .section-title {
      color: var(--o-color-primary1);
    }
  }
}

.section-icon {
  font-size: 40px;

  @include respond-to('<=laptop') {
    font-size: 32px;
  }
}

.section-title {
  color: var(--o-color-info1);
  font-weight: 500;
  margin-top: 8px;
  @include h4;

  @include respond-to('<=laptop') {
    margin-top: 0;
  }
}

.section-no-icon {
  margin-top: 0;
  @include h3;
}

.section-bg-icon {
  position: absolute;
  right: -8px;
  bottom: -8px;
  width: 70px;

  @include respond-to('<=laptop') {
    width: 50px;
  }
}
</style>
