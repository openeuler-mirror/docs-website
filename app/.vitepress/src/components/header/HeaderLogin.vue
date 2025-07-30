<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ODropdown, ODropdownItem, OIcon, OIconLoading, OBadge } from '@opensig/opendesign';

import { doLogin, logout, tryLogin } from '@/shared/login';
import { useLoginStore, useUserInfoStore } from '@/stores/user';
import { windowOpen } from '@/utils/common';
import { useLocale } from '@/composables/useLocale';
import { getUnreadMsgCount } from '@/api/api-message';

import IconLogin from '~icons/app/icon-header-person.svg';

const { t, locale } = useLocale();

const userInfoStore = useUserInfoStore();
const loginStore = useLoginStore();

const jumpToUserZone = () => {
  const language = locale.value === 'zh' ? 'zh' : 'en';
  windowOpen(`${import.meta.env.VITE_MAIN_DOMAIN_URL}/${language}/workspace`, '_blank');
};

const jumpToMsgCenter = () => {
  windowOpen(import.meta.env.VITE_SERVICE_MESSAGE_CENTER_URL);
};

const unreadMsgCount = ref(0);
const getMsgCount = async () => {
  if (!userInfoStore.getGiteeId) {
    return;
  }

  try {
    const data = await getUnreadMsgCount(userInfoStore.getGiteeId);
    unreadMsgCount.value = Object.values(data).reduce((count, val) => count + val, 0);
  } catch {
    // nothing
  }
};

onMounted(async () => {
  await tryLogin();
  getMsgCount();
});
</script>

<template>
  <template v-if="loginStore.isLogined">
    <ODropdown trigger="hover" optionPosition="bottom" optionWrapClass="user-dropdown">
      <div class="user-info">
        <OBadge v-if="unreadMsgCount" :value="unreadMsgCount" color="danger">
          <img v-if="userInfoStore.photo" :src="userInfoStore.photo" />
          <OIcon v-else class="login-btn"><IconLogin /></OIcon>
        </OBadge>
        <template v-else>
          <img v-if="userInfoStore.photo" :src="userInfoStore.photo" />
          <OIcon v-else class="login-btn"><IconLogin /></OIcon>
        </template>
        <span class="username">{{ userInfoStore.username }}</span>
      </div>
      <template #dropdown>
        <ODropdownItem>
          <div class="header-user-menu-item" :class="{ 'item-en': locale === 'en' }" @click="jumpToUserZone">{{ t('header.USER_CENTER') }}</div>
        </ODropdownItem>
        <ODropdownItem>
          <div class="header-user-menu-item" :class="{ 'item-en': locale === 'en' }" @click="jumpToMsgCenter">
            <OBadge v-if="unreadMsgCount" :value="unreadMsgCount" color="danger">{{ t('header.MESSAGE_CENTER') }}</OBadge>
            <span v-else>{{ t('header.MESSAGE_CENTER') }}</span>
          </div>
        </ODropdownItem>
        <ODropdownItem>
          <div class="header-user-menu-item" :class="{ 'item-en': locale === 'en' }" @click="logout">{{ t('header.LOGOUT') }}</div>
        </ODropdownItem>
      </template>
    </ODropdown>
  </template>
  <div v-else-if="loginStore.isLoggingIn" class="o-rotating">
    <OIconLoading />
  </div>

  <OIcon v-else class="login-btn" @click="doLogin"><IconLogin /></OIcon>
</template>

<style scoped lang="scss">
.user-info {
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
  position: relative;
  height: 80px;
  color: var(--o-color-info1);
  img {
    width: 32px;
    height: 32px;
    border-radius: 50%;

     @include respond-to('<=pad_v') {
      width: 28px;
      height: 28px;
    }
  }

  @include respond-to('<=pad_v') {
    height: 48px;

    img {
      width: 28px;
      height: 28px;
    }

    .username { 
      display: none;
    }
  }
}

.header-user-menu-item {
  min-width: 144px;
  text-align: center;
}

.header-user-menu-item.item-en {
  min-width: 188px;
}

.user-dropdown {
  .o-dropdown-item {
    --dropdown-item-padding: 8px 0;
  }
}

.login-btn {
  color: var(--o-color-info1);
  font-size: var(--o-icon_size-m);
  cursor: pointer;

  @include hover {
    color: var(--o-color-primary1);
  }
}
</style>
