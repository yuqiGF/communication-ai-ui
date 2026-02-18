<template>
  <div class="flex w-full mb-6" :class="isUser ? 'justify-end' : 'justify-start'">
    <div class="flex max-w-[95%] md:max-w-[85%] gap-3" :class="{ 'flex-row-reverse': isUser }">
      <div class="flex-shrink-0 mt-1">
        <div class="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-gray-200"
             :class="isUser ? 'bg-blue-600' : 'bg-white'">
          <span v-if="isUser" class="text-white text-xs">Me</span>
          <img v-else src="../../assets/vue.svg" alt="AI" class="w-5 h-5" />
        </div>
      </div>

      <div class="flex flex-col min-w-0 max-w-full">
        <div
            class="relative px-5 py-3 rounded-2xl shadow-sm overflow-hidden text-sm leading-relaxed"
            :class="[
            isUser
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
          ]"
        >
          <div v-if="!isUser && message.thinkingContent" class="mb-3 pb-3 border-b border-gray-100">
            <div class="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1 select-none cursor-pointer hover:text-blue-500 transition-colors" @click="toggleThinking">
              <span>🧠 深度思考</span>
              <span class="text-[10px]">{{ isThinkingCollapsed ? '(已展开)' : '(点击展开)' }}</span>
            </div>
            <div v-show="isThinkingCollapsed" class="text-xs text-gray-500 italic bg-gray-50 p-2 rounded whitespace-pre-wrap">
              {{ message.thinkingContent }}
            </div>
          </div>

          <div
              v-if="message.content"
              class="markdown-content prose prose-sm max-w-none break-words"
              :class="isUser ? 'prose-invert prose-p:text-white prose-a:text-white' : 'prose-slate'"
              v-html="renderedContent"
          ></div>

          <div v-if="message.isLoading && !message.content" class="flex gap-1 py-1 h-6 items-center">
            <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
            <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
            <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ChatMessage } from '../../types/chat';
import MarkdownIt from 'markdown-it';
import tm from 'markdown-it-texmath';
import katex from 'katex';
import hljs from 'highlight.js';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/atom-one-light.css';
import 'markdown-it-texmath/css/texmath.css';

const props = defineProps<{
  message: ChatMessage;
}>();

const isUser = computed(() => props.message.role === 'user');
const isThinkingCollapsed = ref(true);

const toggleThinking = () => {
  isThinkingCollapsed.value = !isThinkingCollapsed.value;
};

// --- Markdown & Katex 配置 ---
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
});

md.use(tm, {
  engine: katex,
  delimiters: 'dollars',
  katexOptions: {
    macros: { '\\RR': '\\mathbb{R}' },
    throwOnError: false,
    errorColor: '#cc0000',
  }
});

/**
 * 终极预处理函数
 * 修复：\quadX, \pift, ---###, 以及 $$ 换行问题
 */
const preprocessMarkdown = (text: string) => {
  if (!text) return '';

  // 1. 【代码块保护】先把代码块提取出来，防止误伤
  const codeBlocks: string[] = [];
  let pText = text.replace(/(`{3,}[\s\S]*?`{3,}|`[^`\n]+`)/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // --- 以下操作仅针对非代码部分 ---

  // 2. 【核心修复 A】解决 LaTeX 命令粘连问题 (针对截图中的红色报错)
  // 解释：查找 \quad, \pi, \int 等常用命令，如果后面紧跟字母或数字，强制加空格
  // 这将修复 \quadX -> \quad X 和 \pift -> \pi ft
  pText = pText.replace(/\\(quad|pi|alpha|beta|gamma|delta|theta|lambda|sigma|omega|mu|nu|tau|rho|phi|chi|psi|int|sum|prod|lim|infty)([a-zA-Z0-9])/g, '\\$1 $2');

  // 3. 【核心修复 B】解决 Markdown 结构粘连问题 (针对截图中的 ---###)
  // 确保 ### 标题前有两个换行
  pText = pText.replace(/([^\n])\s*(#{1,6}\s)/g, '$1\n\n$2');
  // 确保 --- 分割线前有两个换行
  pText = pText.replace(/([^\n])\s*(---)/g, '$1\n\n$3');
  // 解决 $---### 这种极端情况（美元符号粘着分割线）
  pText = pText.replace(/(\$)\s*(---)/g, '$1\n\n$2');

  // 4. 【核心修复 C】块级公式 $$ 的换行修复
  // 如果 $$ 紧跟在文字后面，强制换行，使其渲染为块级而不是行内源码
  pText = pText.replace(/([^\n])\s*\$\$/g, '$1\n$$$$'); // $$ 前加换行
  pText = pText.replace(/\$\$\s*([^\n])/g, '$$$$\n$1'); // $$ 后加换行

  // 5. 【定界符归一化】兼容 AI 的 \[ \] 和 \( \)
  pText = pText.replace(/([^\\]|^)\\\[/g, '$1$$$$');
  pText = pText.replace(/([^\\]|^)\\\]/g, '$1$$$$');
  pText = pText.replace(/([^\\]|^)\\\(/g, '$1$');
  pText = pText.replace(/([^\\]|^)\\\)/g, '$1$');

  // 6. 【还原代码块】
  return pText.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
    return codeBlocks[Number(index)];
  });
};

const renderedContent = computed(() => {
  try {
    const cleanText = preprocessMarkdown(props.message.content || '');
    return md.render(cleanText);
  } catch (e) {
    console.error('Markdown rendering error:', e);
    return props.message.content || '';
  }
});
</script>

<style scoped>
/* 样式保持原样，微调间距 */
:deep(.prose) {
  font-size: 0.95rem;
  line-height: 1.7;
}

:deep(.prose pre) {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.8em;
  margin: 1em 0;
  overflow-x: auto;
}

:deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5em 0;
  margin: 1em 0;
  max-width: 100%;
}

/* 红色报错时的兜底样式 */
:deep(.katex-error) {
  color: #cc0000;
  font-family: monospace;
  font-size: 0.9em;
}
</style>