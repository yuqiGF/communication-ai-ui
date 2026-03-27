<template>
  <n-layout has-sider class="h-screen bg-gray-50">
    <!-- 1. 侧边栏：历史记录与新建会话 -->
    <n-layout-sider
        bordered
        collapse-mode="width"
        :collapsed-width="64"
        :width="260"
        :native-scrollbar="false"
        class="!bg-[#f9f9fa]"
    >
      <div class="flex flex-col h-full">
        <div class="p-4">
          <n-button dashed block class="!justify-start !h-10 mb-4" @click="handleNewChat">
            <template #icon>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg></n-icon>
            </template>
            新建会话
          </n-button>
        </div>

        <div class="flex-1 overflow-y-auto px-2">
          <div class="text-xs text-gray-400 font-medium px-2 mb-2">最近记录</div>
          <div
              v-for="item in historyList"
              :key="item.id"
              class="group flex items-center gap-2 p-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors"
              :class="{'bg-white shadow-sm': currentSessionId === item.id}"
              @click="currentSessionId = item.id"
          >
            <n-icon :size="16" class="text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
            </n-icon>
            <span class="truncate flex-1">{{ item.title }}</span>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 flex items-center gap-3">
          <n-avatar round size="small" :src="user.avatar" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ user.name }}</div>
          </div>
          <n-button text @click="$emit('logout')">
            <n-icon size="18"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg></n-icon>
          </n-button>
        </div>
      </div>
    </n-layout-sider>

    <n-layout class="bg-gray-50 h-full">
      <div class="flex flex-col h-full relative">
        <!-- 2. 顶部导航栏 -->
        <header class="h-14 bg-white/80 backdrop-blur border-b flex items-center justify-between px-6 shadow-sm z-10 sticky top-0 shrink-0">
          <div class="flex items-center gap-3">
            <h1 class="text-lg font-bold text-gray-800">通信原理智能问答系统</h1>
            <n-tag type="info" size="small" round :bordered="false" class="!bg-blue-50 !text-blue-600">
              qwen3-bupt
            </n-tag>
          </div>

          <div class="flex items-center gap-2">
            <n-popconfirm @positive-click="handleClearMemory">
              <template #trigger>
                <n-button quaternary size="small" type="warning">
                  <template #icon>
                    <n-icon><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg></n-icon>
                  </template>
                  清除记忆
                </n-button>
              </template>
              确定要清除当前的对话上下文记忆吗？这不会删除历史记录。
            </n-popconfirm>
          </div>
        </header>

        <!-- 3. 动态分栏的主区域：一分为二的设计 -->
        <div class="flex-1 flex overflow-hidden">
          <!-- 左侧：聊天主区域 -->
          <main class="flex-1 overflow-y-auto p-4 scroll-smooth transition-all duration-300 relative"
                :class="{ 'max-w-[50%] border-r border-gray-200': currentMindMapData }"
                ref="chatContainer">
            <div class="max-w-3xl mx-auto min-h-full pb-4">
              <!-- 欢迎界面 -->
              <div v-if="chatList.length === 0" class="flex flex-col items-center justify-center mt-20 text-gray-400 space-y-6 select-none">
                <div class="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                  <span class="text-4xl">📡</span>
                </div>
                <div class="text-center">
                  <h2 class="text-xl font-bold text-gray-700 mb-2">有什么可以帮你的吗？</h2>
                  <p class="text-sm">支持深度思考、思维导图生成以及 RAG 知识库检索</p>
                </div>
                <div class="grid grid-cols-2 gap-3 w-full max-w-lg mt-8">
                  <div @click="quickAsk('香农公式的物理意义是什么？')" class="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition text-sm text-gray-600">
                    📖 香农公式的物理意义
                  </div>
                  <div @click="quickAsk('请生成QAM调制的思维导图')" class="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition text-sm text-gray-600">
                    🗺️ 生成 QAM 调制思维导图
                  </div>
                  <div @click="quickAsk('解释一下眼图及其作用')" class="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition text-sm text-gray-600">
                    👁️ 解释眼图及其作用
                  </div>
                  <div @click="quickAsk('PCM编码的三个步骤')" class="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition text-sm text-gray-600">
                    🔢 PCM 编码步骤
                  </div>
                </div>
              </div>

              <MessageBubble
                  v-for="msg in chatList"
                  :key="msg.id"
                  :message="msg"
              />
            </div>
          </main>

          <!-- 右侧：知识图谱区域 -->
          <aside v-if="currentMindMapData" class="flex-1 bg-white flex flex-col shadow-inner transition-all duration-300 animate-fade-in-right">
            <div class="h-12 border-b border-gray-100 flex items-center justify-between px-4 bg-gray-50">
              <span class="text-sm font-bold text-gray-600 flex items-center gap-2">
                <span class="text-base">🧠</span> Neo4j 知识图谱提取
                <n-tag size="small" type="success" :bordered="false">双击节点展开关联</n-tag>
              </span>
              <n-button text circle size="small" @click="currentMindMapData = null">
                <template #icon>
                  <n-icon size="18"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></n-icon>
                </template>
              </n-button>
            </div>
            <!-- 渲染我们刚刚写的 Echarts 图谱组件 -->
            <div class="flex-1 relative w-full h-full p-2">
              <Neo4jGraph :graph-data="currentMindMapData" />
            </div>
          </aside>
        </div>

        <!-- 4. 底部输入区 -->
        <footer class="bg-white border-t p-4 pb-6 shrink-0 z-20">
          <div class="max-w-3xl mx-auto" :class="{'max-w-none px-6': currentMindMapData}">
            <div class="relative bg-white border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all overflow-hidden">

              <n-input
                  v-model:value="inputValue"
                  type="textarea"
                  placeholder="输入关于通信原理的问题..."
                  :autosize="{ minRows: 2, maxRows: 8 }"
                  :bordered="false"
                  class="!bg-transparent text-base !pb-12"
                  @keydown.enter.prevent="handleSend"
                  :disabled="isGenerating"
              />

              <!-- 功能工具栏 (Toolbar) -->
              <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div class="flex items-center gap-3 ml-1">
                  <!-- 深度思考开关 -->
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <div class="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 transition"
                           :class="{'bg-purple-50 text-purple-600': enableDeepThink}"
                           @click="enableDeepThink = !enableDeepThink">
                        <n-switch v-model:value="enableDeepThink" size="small" class="pointer-events-none" />
                        <span class="text-xs font-medium">深度思考</span>
                      </div>
                    </template>
                    开启后模型将进行更深入的逻辑推理
                  </n-tooltip>

                  <!-- 思维导图开关 -->
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <div class="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 transition"
                           :class="{'bg-teal-50 text-teal-600': enableMindMap}"
                           @click="enableMindMap = !enableMindMap">
                        <n-switch v-model:value="enableMindMap" size="small" class="pointer-events-none">
                          <template #checked-icon>🗺️</template>
                          <template #unchecked-icon>📄</template>
                        </n-switch>
                        <span class="text-xs font-medium">思维导图</span>
                      </div>
                    </template>
                    请求生成 Neo4j 图谱模型并分屏展示
                  </n-tooltip>
                </div>

                <n-button
                    type="primary"
                    size="small"
                    round
                    :loading="isGenerating"
                    @click="handleSend"
                    :disabled="!inputValue.trim()"
                    class="!px-4"
                >
                  <template #icon>
                    <n-icon>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </n-icon>
                  </template>
                </n-button>
              </div>
            </div>

            <div class="text-center mt-2 text-xs text-gray-400">
              AI 生成内容仅供参考，请以教材为准
            </div>
          </div>
        </footer>
      </div>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import {
  NButton, NInput, NTag, useMessage, NLayout, NLayoutSider,
  NIcon, NAvatar, NSwitch, NTooltip, NPopconfirm
} from 'naive-ui';
import MessageBubble from '../components/Chat/MessageBubble.vue';
import Neo4jGraph from '../components/Chat/Neo4jGraph.vue'; // 引入新写的图谱组件
import { streamChatCompletion, createNewSession, clearSessionMemory, fetchNeo4jGraph } from '../api/chatService';
import type { ChatMessage, UserInfo, ChatSession } from '../types/chat';

const props = defineProps<{ user: UserInfo }>();
const emit = defineEmits(['logout']);

const messageApi = useMessage();
const inputValue = ref('');
const chatList = ref<ChatMessage[]>([]);
const isGenerating = ref(false);
const chatContainer = ref<HTMLElement | null>(null);

const enableDeepThink = ref(false);
const enableMindMap = ref(false);
const currentMindMapData = ref<any>(null); // 保存当前的图谱数据用于渲染

const currentSessionId = ref('default');
const historyList = ref<ChatSession[]>([
  { id: '1', title: '香农公式讨论', lastTime: Date.now() },
  { id: '2', title: '数字调制技术', lastTime: Date.now() - 86400000 },
]);

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const quickAsk = (text: string) => {
  inputValue.value = text;
  handleSend();
};

const handleNewChat = async () => {
  try {
    const newSessionId = await createNewSession();
    currentSessionId.value = newSessionId;
    chatList.value = [];
    currentMindMapData.value = null; // 重置界面
    historyList.value.unshift({ id: newSessionId, title: '新对话', lastTime: Date.now() });
    messageApi.success('已创建新会话');
  } catch (e) {
    messageApi.error('创建会话失败');
  }
};

const handleClearMemory = async () => {
  try {
    await clearSessionMemory(currentSessionId.value);
    chatList.value = [];
    currentMindMapData.value = null; // 清除时也重置视图
    messageApi.success('记忆已清除，开启新话题');
  } catch (e) {
    messageApi.error('清除失败');
  }
};

const handleSend = async (e?: KeyboardEvent) => {
  if (e && e.shiftKey) return;
  if (!inputValue.value.trim() || isGenerating.value) return;

  const userText = inputValue.value;
  inputValue.value = '';

  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: userText,
    timestamp: Date.now()
  };
  chatList.value.push(userMsg);
  await scrollToBottom();

  const assistantMsgId = (Date.now() + 1).toString();
  const assistantMsg = ref<ChatMessage>({
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    isLoading: true,
    sources: [],
    hasMindMap: enableMindMap.value,
    thinkingContent: enableDeepThink.value ? '正在深度思考...\n' : undefined
  });
  chatList.value.push(assistantMsg.value);

  // ============================================
  // [请求新增位置] 如果开启了思维导图，向新的后端接口发起请求
  // ============================================
  if (enableMindMap.value) {
    currentMindMapData.value = null; // 发起前重置旧数据
    fetchNeo4jGraph(userText).then(data => {
      currentMindMapData.value = data; // 赋值后，右侧面板会自动弹出来进行一分为二渲染
    }).catch(err => {
      console.error(err);
      messageApi.error('获取知识图谱失败');
    });
  }

  isGenerating.value = true;
  await streamChatCompletion(
      chatList.value.slice(0, -1),
      {
        enableDeepThink: enableDeepThink.value,
        enableMindMap: enableMindMap.value,
        sessionId: currentSessionId.value
      },
      (textChunk, sources) => {
        assistantMsg.value.content += textChunk;
        if (sources) assistantMsg.value.sources = sources;
        scrollToBottom();
      },
      () => {
        assistantMsg.value.isLoading = false;
        isGenerating.value = false;
      },
      (err) => {
        assistantMsg.value.isLoading = false;
        assistantMsg.value.content += '\n\n[系统提示: 生成出错]';
        isGenerating.value = false;
        messageApi.error('网络请求失败');
      }
  );
};
</script>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 右侧弹出动画 */
.animate-fade-in-right {
  animation: fadeInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>