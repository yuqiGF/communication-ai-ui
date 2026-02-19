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
  html: false, // 禁用 HTML 标签以防止 XSS
  linkify: true,
  typographer: true,
  breaks: true, // 保留换行
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
});

// 使用 texmath 插件处理公式
md.use(tm, {
  engine: katex,
  delimiters: 'dollars',
  katexOptions: {
    macros: { '\\RR': '\\mathbb{R}' },
    throwOnError: false,
    errorColor: '#cc0000',
    displayMode: true,
    fleqn: false
  }
});

/**
 * 终极预处理函数 - 增强版 V2
 * 1. 保护代码块和数学公式（关键！防止 regex 误伤公式中的 | 符号）
 * 2. 修复 LaTeX 粘连
 * 3. 修复 Markdown 结构（标题、分割线、表格、列表）
 */
const preprocessMarkdown = (text: string) => {
  if (!text) return '';

  // 1. 【代码块保护】
  const codeBlocks: string[] = [];
  let pText = text.replace(/(`{3,}[\s\S]*?`{3,}|`[^`\n]+`)/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // 2. 【LaTeX 预处理】
  // 修复命令粘连 (e.g., \quadX -> \quad X)
  pText = pText.replace(/\\(quad|pi|alpha|beta|gamma|delta|theta|lambda|sigma|omega|mu|nu|tau|rho|phi|chi|psi|int|sum|prod|lim|infty)([a-zA-Z0-9])/g, '\\$1 $2');

  // 归一化定界符
  pText = pText.replace(/([^\\]|^)\\\[/g, '$1$$$$');
  pText = pText.replace(/([^\\]|^)\\\]/g, '$1$$$$');
  pText = pText.replace(/([^\\]|^)\\\(/g, '$1$');
  pText = pText.replace(/([^\\]|^)\\\)/g, '$1$');

  // 自动包裹裸露的块级环境
  const blockEnvs = ['aligned', 'align', 'equation', 'gather', 'matrix', 'pmatrix', 'bmatrix', 'cases'];
  const envRegex = new RegExp(`(^|[^$])(\\\\begin\\{(${blockEnvs.join('|')})\\}[\\s\\S]*?\\\\end\\{\\3\\})`, 'g');
  pText = pText.replace(envRegex, '$1\n$$$$\n$2\n$$$$\n');

  // 确保 $$ 前后换行
  pText = pText.replace(/([^\n])\s*\$\$/g, '$1\n$$$$');
  pText = pText.replace(/\$\$\s*([^\n])/g, '$$$$\n$1');

  // 3. 【数学公式保护】(防止被后续的 Markdown 表格修复逻辑误伤)
  const mathBlocks: string[] = [];
  // 保护块级公式 $$...$$
  pText = pText.replace(/(\$\$[\s\S]*?\$\$)/g, (match) => {
    mathBlocks.push(match);
    return `__MATH_BLOCK_${mathBlocks.length - 1}__`;
  });
  // 保护行内公式 $...$ (排除转义的 \$)
  pText = pText.replace(/((?<!\\)\$[^$\n]+(?<!\\)\$)/g, (match) => {
    mathBlocks.push(match);
    return `__MATH_BLOCK_${mathBlocks.length - 1}__`;
  });

  // --- 以下为纯文本 Markdown 结构修复 ---

  // 4. 【结构修复：分割线】(优先级调高)
  // 修复 "结束。---###" 连写，必须在标题修复前执行，否则 --- 会被标题修复误伤
  // 同时也支持 --- 后紧跟标题且无空格的情况
  pText = pText.replace(/([^\n])\s*---\s*(#{1,6})(?=[^#])/g, '$1\n\n---\n\n$2');

  // 5. 【结构修复：标题】
  // 5.1 确保标题 # 后有空格 (###Title -> ### Title)
  pText = pText.replace(/(^|\n)\s*(#{1,6})([^ #\n])/g, '$1$2 $3');
  // 5.2 确保 ### 前有换行
  pText = pText.replace(/([^\n])\s*(#{1,6}\s)/g, '$1\n\n$2');

  // 6. 【结构修复：表格】
  // 确保表格 Header 前有换行
  // 此时公式已隐藏，| 符号只可能出现在表格或普通文本中，不会误伤公式
  pText = pText.replace(/([^\n])\n((?:\|.*?)+\|)/g, '$1\n\n$2');

  // 7. 【结构修复：列表】
  // 确保无序列表 - 前有换行
  pText = pText.replace(/([^\n])\n\s*(- \s)/g, '$1\n\n$2');
  // 确保有序列表 1. 前有换行
  pText = pText.replace(/([^\n])\n\s*(\d+\.\s)/g, '$1\n\n$2');

  // 8. 【还原占位符】(倒序还原：先公式后代码)
  pText = pText.replace(/__MATH_BLOCK_(\d+)__/g, (_, index) => {
    return mathBlocks[Number(index)];
  });

  pText = pText.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
    return codeBlocks[Number(index)];
  });

  return pText;
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

/* 公式样式 */
:deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5em 0;
  margin: 1em 0;
  max-width: 100%;
}

/* 错误提示 */
:deep(.katex-error) {
  color: #cc0000;
  font-family: monospace;
  font-size: 0.9em;
}

/* 表格样式增强 */
:deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 0.9em;
}

:deep(th), :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 0.5em 0.75em;
  text-align: left;
}

:deep(th) {
  background-color: #f8fafc;
  font-weight: 600;
  color: #475569;
}

:deep(tr:nth-child(even)) {
  background-color: #fcfcfd;
}
</style>