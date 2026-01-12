// 知识库引用源 (对应概要设计 3.6 RAG 模块)
export interface ReferenceSource {
    id: string;
    title: string;       // 文档标题 (如《通信原理》第三章)
    contentSnippet: string; // 命中片段
    score: number;       // 匹配置信度
    location?: string;   // 页码或链接
}

// 聊天消息实体
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    isLoading?: boolean; // 是否正在生成
    sources?: ReferenceSource[]; // [RAG] 附带的知识库引用
}