<script setup lang="ts">
import { NMessageProvider } from 'naive-ui'
import HomeView from './views/HomeView.vue'
</script>

<template>
  <n-message-provider>
    <HomeView />
  </n-message-provider>
</template>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>