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
 * [AJAX] 获取Neo4j知识图谱/思维导图数据 (真实后端接口)
 */
export async function fetchNeo4jGraph(keyword: string): Promise<any> {
    const targetUrl = `${API_BASE_URL}/graph/search?keyword=${encodeURIComponent(keyword)}`;
    console.log(`// [AJAX Request] GET ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`图谱接口报错: ${response.status} ${response.statusText}`);
        }

        // 解析后端返回的 GraphData (包含 nodes 和 edges)
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('获取知识图谱失败:', error);
        throw error;
    }
}

/**
 * [AJAX] 扩展图谱节点 (绕过AI，直接查询Neo4j)
 */
export async function expandNeo4jGraph(nodeName: string): Promise<any> {
    const targetUrl = `${API_BASE_URL}/graph/extend?nodeName=${encodeURIComponent(nodeName)}`;
    console.log(`// [AJAX Request] GET ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`节点扩展接口报错: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('扩展图谱节点失败:', error);
        throw error;
    }
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
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '') continue;

                if (line.startsWith('data:')) {
                    let rawData = line.slice(5);
                    if (rawData.startsWith(' ')) {
                        rawData = rawData.slice(1);
                    }

                    if (rawData.trim() === '[DONE]') continue;

                    try {
                        const json = JSON.parse(rawData);
                        let content = '';
                        if (typeof json === 'string') {
                            content = json;
                        } else if (json.content) {
                            content = json.content;
                        } else if (json.choices && json.choices[0]?.delta?.content) {
                            content = json.choices[0].delta.content;
                        } else if (json.output && json.output.content) {
                            content = json.output.content;
                        }

                        if (content) onChunk(content, []);

                    } catch (e) {
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