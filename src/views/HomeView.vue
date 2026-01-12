<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <header class="h-16 bg-white border-b flex items-center px-6 shadow-sm z-10">
      <h1 class="text-lg font-bold text-gray-800">通信原理智能问答系统</h1>
      <n-tag type="info" class="ml-3" size="small">RAG 增强模式</n-tag>
    </header>

    <main class="flex-1 overflow-y-auto p-6 scroll-smooth" ref="chatContainer">
      <div class="max-w-4xl mx-auto">
        <div v-if="chatList.length === 0" class="text-center mt-20 text-gray-400">
          <p class="text-xl mb-2">👋 你好，我是你的通信原理助教</p>
          <p class="text-sm">你可以问我关于“香农公式”、“眼图”或“QAM调制”的问题</p>
        </div>

        <MessageBubble
            v-for="msg in chatList"
            :key="msg.id"
            :message="msg"
        />
      </div>
    </main>

    <footer class="bg-white border-t p-4">
      <div class="max-w-4xl mx-auto">

        <div class="flex items-end border border-gray-200 rounded-xl bg-gray-50 p-2 gap-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-colors">

          <n-input
              v-model:value="inputValue"
              type="textarea"
              placeholder="请输入您的问题... (Enter 发送)"
              :autosize="{ minRows: 1, maxRows: 6 }"
              :bordered="false"
              class="flex-1 !bg-transparent !py-0 text-base"
              @keydown.enter.prevent="handleSend"
              :disabled="isGenerating"
          />

          <n-button
              type="primary"
              size="medium"
              :loading="isGenerating"
              @click="handleSend"
              :disabled="!inputValue.trim()"
              class="!h-[34px] !px-4"
          >
            <template #icon>
              <n-icon size="18">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </n-icon>
            </template>
            <span class="font-medium">发送</span>
          </n-button>
        </div>

        <div class="text-center mt-2 text-xs text-gray-400">
          内容由 AI 生成，请注意甄别。系统已开启敏感词过滤。
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { NButton, NInput, NTag, useMessage } from 'naive-ui';
import MessageBubble from '../components/Chat/MessageBubble.vue';
import { streamChatCompletion } from '../api/chatService';
import type { ChatMessage } from '../types/chat';

// 状态定义
const inputValue = ref('');
const chatList = ref<ChatMessage[]>([]);
const isGenerating = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
const messageApi = useMessage();

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

// 发送处理逻辑
const handleSend = async (e?: KeyboardEvent) => {
  if (e && e.shiftKey) return; // Shift+Enter 换行
  if (!inputValue.value.trim() || isGenerating.value) return;

  const userText = inputValue.value;
  inputValue.value = '';

  // 1. 添加用户消息
  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: userText,
    timestamp: Date.now()
  };
  chatList.value.push(userMsg);
  await scrollToBottom();

  // 2. 预占位 Assistant 消息
  const assistantMsgId = (Date.now() + 1).toString();
  const assistantMsg = ref<ChatMessage>({
    id: assistantMsgId,
    role: 'assistant',
    content: '', // 初始为空，等待流式填充
    timestamp: Date.now(),
    isLoading: true,
    sources: []
  });
  chatList.value.push(assistantMsg.value);

  // 3. 调用 API (对应概要设计 3.2 智能问答核心模块)
  isGenerating.value = true;

  await streamChatCompletion(
      chatList.value.slice(0, -1), // 排除当前正在生成的这条空消息
      (textChunk, sources) => {
        // 流式更新内容
        assistantMsg.value.content += textChunk;
        if (sources) {
          assistantMsg.value.sources = sources; // 更新引用源
        }
        scrollToBottom();
      },
      () => {
        // 完成
        assistantMsg.value.isLoading = false;
        isGenerating.value = false;
      },
      (err) => {
        // 错误处理
        assistantMsg.value.isLoading = false;
        assistantMsg.value.content += '\n\n[系统提示: 生成出错，请稍后重试]';
        isGenerating.value = false;
        messageApi.error('网络请求失败');
        console.error(err);
      }
  );
};
</script>