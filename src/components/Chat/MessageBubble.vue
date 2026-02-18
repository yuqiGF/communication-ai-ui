<template>
  <div class="flex w-full mb-6" :class="isUser ? 'justify-end' : 'justify-start'">
    <div class="flex max-w-[95%] md:max-w-[85%] gap-3" :class="{ 'flex-row-reverse': isUser }">

      <!-- 头像 -->
      <div class="flex-shrink-0 mt-1">
        <div class="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-gray-200"
             :class="isUser ? 'bg-blue-600' : 'bg-white'">
          <span v-if="isUser" class="text-white text-xs">Me</span>
          <img v-else src="../../assets/vue.svg" alt="AI" class="w-5 h-5" />
        </div>
      </div>

      <!-- 消息主体 -->
      <div class="flex flex-col min-w-0 max-w-full">
        <div
            class="relative px-5 py-3 rounded-2xl shadow-sm overflow-hidden text-sm leading-relaxed"
            :class="[
            isUser
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
          ]"
        >
          <!-- 深度思考区 -->
          <div v-if="!isUser && message.thinkingContent" class="mb-3 pb-3 border-b border-gray-100">
            <div class="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1 select-none cursor-pointer hover:text-blue-500 transition-colors" @click="toggleThinking">
              <span>🧠 深度思考</span>
              <span class="text-[10px]">{{ isThinkingCollapsed ? '(已展开)' : '(点击展开)' }}</span>
            </div>
            <div v-show="isThinkingCollapsed" class="text-xs text-gray-500 italic bg-gray-50 p-2 rounded whitespace-pre-wrap">
              {{ message.thinkingContent }}
            </div>
          </div>

          <!-- Markdown 内容渲染区 -->
          <div
              v-if="message.content"
              class="markdown-content prose prose-sm max-w-none break-words"
              :class="isUser ? 'prose-invert prose-p:text-white prose-a:text-white' : 'prose-slate'"
              v-html="renderedContent"
          ></div>

          <!-- Loading 光标 -->
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
import mk from 'markdown-it-katex';
import hljs from 'highlight.js';

// 引入样式
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/atom-one-light.css';

const props = defineProps<{
  message: ChatMessage;
}>();

const isUser = computed(() => props.message.role === 'user');
const isThinkingCollapsed = ref(true);

const toggleThinking = () => {
  isThinkingCollapsed.value = !isThinkingCollapsed.value;
};

// --- 初始化 Markdown 解析器 ---
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

md.use(mk);

/**
 * 文本预处理：清洗、去重和归一化
 */
const preprocessMarkdown = (text: string) => {
  if (!text) return '';
  let processed = text;

  // 1. 清理零宽字符等不可见干扰项
  processed = processed.replace(/[\u200b\u200c\u200d\uFEFF]/g, '');

  // 2. 修复粘连文本 (例如 "dtX(f)=") - 强制换行
  processed = processed.replace(/(dt|dx|df|d\w|\)|\])\s*([A-Z][\w\(\)\[\]]*\s*=|\\)/g, '$1\n$2');

  // 3. 归一化公式定界符
  processed = processed.replace(/\\\[/g, '$$');
  processed = processed.replace(/\\\]/g, '$$');
  processed = processed.replace(/\\\(/g, '$');
  processed = processed.replace(/\\\)/g, '$');

  // 4. Unicode 数学符号转 LaTeX
  const unicodeMap: Record<string, string> = {
    '∫': '\\int ', '∬': '\\iint ', '∞': '\\infty', 'π': '\\pi', '⋅': '\\cdot ',
    '×': '\\times ', '≈': '\\approx ', '≠': '\\neq ', '≤': '\\leq ', '≥': '\\geq ', '−': '-',
  };
  processed = processed.replace(/[∫∬∞π⋅×≈≠≤≥−]/g, (char) => unicodeMap[char] || char);

  // 5. 确保块级公式独占一行 (Markdown 解析器要求)
  processed = processed.replace(/([^\n])\$\$/g, '$1\n$$');
  processed = processed.replace(/\$\$([^\n])/g, '$$\n$1');

  // 6. 智能去重 (移除内容重复的行)
  // 解决 AI 偶尔先输出文本公式，紧接着输出 LaTeX 公式的问题
  const lines = processed.split('\n');
  const uniqueLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // 取上一行的内容（如果有）
    const prevLine = uniqueLines.length > 0 ? uniqueLines[uniqueLines.length - 1].trim() : '';

    // 生成简易指纹（只保留字母数字，忽略符号差异）
    const currFingerprint = line.replace(/[^a-zA-Z0-9]/g, '');
    const prevFingerprint = prevLine.replace(/[^a-zA-Z0-9]/g, '');

    // 如果指纹长度足够且相同，判断为重复
    if (currFingerprint.length > 5 && currFingerprint === prevFingerprint) {
      // 如果当前行是公式($$)而上一行不是，则用当前行替换上一行（保留渲染效果更好的）
      if (line.includes('$$') && !prevLine.includes('$$')) {
        uniqueLines.pop();
        uniqueLines.push(lines[i]);
      }
      // 如果上一行已经是公式，当前行是文本，则忽略当前行
      else if (prevLine.includes('$$') && !line.includes('$$')) {
        continue;
      }
      // 如果都是公式或都是文本，忽略当前行（去重）
      else {
        continue;
      }
    } else {
      uniqueLines.push(lines[i]);
    }
  }

  return uniqueLines.join('\n');
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
  line-height: 1.6;
}

:deep(.prose p) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

:deep(.prose blockquote) {
  font-style: normal;
  font-weight: 400;
  color: #555;
  border-left: 4px solid #e5e7eb;
  padding-left: 1em;
  margin: 1em 0;
}

:deep(.prose pre) {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.8em;
  margin: 0.8em 0;
  overflow-x: auto;
}

:deep(.prose code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.1em 0.3em;
  border-radius: 0.2em;
  font-weight: 500;
  font-size: 0.9em;
}

:deep(.prose pre code) {
  background-color: transparent;
  padding: 0;
  font-size: 0.85em;
  color: inherit;
}

:deep(.katex) {
  font-size: 1.1em;
}

:deep(.katex-display) {
  margin: 1em 0;
  overflow-x: auto;
  overflow-y: hidden;
}
</style>