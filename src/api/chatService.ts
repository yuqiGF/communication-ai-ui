import type { ChatMessage } from '../types/chat';

// 基础路径
const API_BASE_URL = '/api';

/**
 * [AJAX] 登录接口
 */
export async function login(username: string, password: string): Promise<{ token: string, user: any }> {
    console.log('// [AJAX Request] POST /api/auth/login', { username, password });
    await new Promise(resolve => setTimeout(resolve, 800));
    if (username && password) {
        return {
            token: 'mock-jwt-token-123456',
            user: { id: 1, name: username, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` }
        };
    } else {
        throw new Error('用户名或密码不能为空');
    }
}

/**
 * [AJAX] 新建会话
 */
export async function createNewSession(): Promise<string> {
    console.log('// [AJAX Request] POST /api/chat/session');
    await new Promise(resolve => setTimeout(resolve, 300));
    return 'session-' + Date.now();
}

/**
 * [AJAX] 清除记忆
 */
export async function clearSessionMemory(sessionId: string): Promise<void> {
    console.log(`// [AJAX Request] DELETE /api/chat/session/${sessionId}/memory`);
    await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * 流式对话接口
 */
export async function streamChatCompletion(
    messages: ChatMessage[],
    options: {
        enableDeepThink: boolean;
        enableMindMap: boolean;
        sessionId: string;
    },
    onChunk: (content: string, sources?: any[]) => void,
    onDone: () => void,
    onError: (err: any) => void
) {
    try {
        const lastMessage = messages[messages.length - 1];
        const userQuestion = lastMessage?.content || '';

        const params = new URLSearchParams({
            message: userQuestion,
            sessionId: options.sessionId,
            deepThink: options.enableDeepThink.toString(),
            mindMap: options.enableMindMap.toString()
        });

        const targetUrl = `${API_BASE_URL}/ai/QABot/stream?${params.toString()}`;
        console.log('开始流式请求:', targetUrl);

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: { 'Accept': 'text/event-stream' },
        });

        if (!response.ok || !response.body) {
            throw new Error(`接口报错: ${response.status} ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            // 保留最后一个可能不完整的行
            buffer = lines.pop() || '';

            for (const line of lines) {
                // 如果是空行，可能是 SSE 的心跳或消息分隔符，跳过
                if (line.trim() === '') continue;

                if (line.startsWith('data:')) {
                    // [修复关键点 1] 不要使用 trim()，因为 token 可能以空格开头或结尾（如 " hello"）
                    // SSE 规范：如果冒号后有空格，去除第一个空格，保留后续内容
                    let rawData = line.slice(5);
                    if (rawData.startsWith(' ')) {
                        rawData = rawData.slice(1);
                    }

                    // 如果是结束标记
                    if (rawData.trim() === '[DONE]') continue;

                    try {
                        // 1. 尝试解析为 JSON
                        const json = JSON.parse(rawData);

                        let content = '';
                        if (typeof json === 'string') {
                            content = json;
                        } else if (json.content) {
                            content = json.content; // 标准结构
                        } else if (json.choices && json.choices[0]?.delta?.content) {
                            content = json.choices[0].delta.content; // OpenAI 格式
                        } else if (json.output && json.output.content) {
                            content = json.output.content;
                        }

                        if (content) onChunk(content, []);

                    } catch (e) {
                        // 2. 解析失败则视为纯文本流
                        // [修复关键点 2] 绝对不要在这里加 '\n'！
                        // 流式传输的是 token，"你", "好", "吗" 应该直接拼接为 "你好吗"
                        // 只有当 rawData 本身包含 \n 字符时，才会有换行
                        onChunk(rawData, []);
                    }
                }
            }
        }

        onDone();

    } catch (error) {
        console.error('流式请求失败:', error);
        onError(error);
    }
}