<script setup lang="ts">
import { ref } from 'vue';
import { NMessageProvider, NConfigProvider, zhCN, dateZhCN } from 'naive-ui';
import HomeView from './views/HomeView.vue';
import LoginView from './views/LoginView.vue';
import type { UserInfo } from './types/chat';

// 简单状态管理：是否已登录
const isLoggedIn = ref(false);
const currentUser = ref<UserInfo>({
  id: 0,
  name: '访客',
  avatar: ''
});

// 处理登录成功
const onLoginSuccess = (user: UserInfo) => {
  currentUser.value = user;
  isLoggedIn.value = true;
};

// 处理登出
const onLogout = () => {
  isLoggedIn.value = false;
  currentUser.value = { id: 0, name: '', avatar: '' };
};
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <div class="app-container">
        <!-- 页面切换逻辑 -->
        <Transition name="fade" mode="out-in">
          <LoginView v-if="!isLoggedIn" @loginSuccess="onLoginSuccess" />
          <HomeView v-else :user="currentUser" @logout="onLogout" />
        </Transition>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>