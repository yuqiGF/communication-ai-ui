// 知识库引用源
export interface ReferenceSource {
    id: string;
    title: string;
    contentSnippet: string;
    score: number;
    location?: string;
}

// 聊天消息实体
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    isLoading?: boolean;
    sources?: ReferenceSource[];

    // [UI State] 是否包含思维导图 (如果是true，UI层可以尝试解析content中的mermaid语法进行渲染)
    hasMindMap?: boolean;
    // [UI State] 是否包含深度思考过程 (UI层可以折叠显示思考内容)
    thinkingContent?: string;
}

// 用户信息
export interface UserInfo {
    id: number | string;
    name: string;
    avatar: string;
    token?: string;
}

// 会话/历史记录 (用于侧边栏)
export interface ChatSession {
    id: string;
    title: string;
    lastTime: number;
}