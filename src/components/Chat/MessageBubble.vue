<template>
  <div :class="['flex w-full mb-6', isUser ? 'justify-end' : 'justify-start']">
    <div v-if="!isUser" class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 shrink-0">
      🤖
    </div>

    <div class="max-w-[80%]">
      <div :class="['p-4 rounded-lg shadow-sm text-sm leading-relaxed',
        isUser ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800']">

        <div v-if="!isUser" v-html="renderMarkdown(message.content)" class="markdown-body"></div>
        <div v-else>{{ message.content }}</div>

        <span v-if="message.isLoading" class="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span>
      </div>

      <div v-if="!isUser && message.sources && message.sources.length > 0" class="mt-2 space-y-2">
        <div class="text-xs text-gray-500 font-bold">📚 知识库引用:</div>
        <div v-for="source in message.sources" :key="source.id"
             class="bg-gray-50 border border-gray-200 rounded p-2 text-xs hover:bg-gray-100 transition cursor-pointer">
          <div class="font-semibold text-blue-600 truncate">{{ source.title }}</div>
          <div class="text-gray-500 truncate mt-1">匹配度: {{ (source.score * 100).toFixed(1) }}%</div>
        </div>
      </div>
    </div>

    <div v-if="isUser" class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ml-3 shrink-0">
      👤
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';
import type { ChatMessage } from '../../types/chat';

const props = defineProps<{ message: ChatMessage }>();
const isUser = computed(() => props.message.role === 'user');
const md = new MarkdownIt();

const renderMarkdown = (text: string) => {
  return md.render(text);
};
</script>

<style>
/* 简单的 Markdown 样式修正 */
.markdown-body ul { list-style: disc; padding-left: 1.5em; }
.markdown-body p { margin-bottom: 0.5em; }
</style>