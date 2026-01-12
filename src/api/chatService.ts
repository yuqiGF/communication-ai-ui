import type { ChatMessage } from '../types/chat';

// 基础路径
const API_BASE_URL = '/api';

export async function streamChatCompletion(
    messages: ChatMessage[],
    onChunk: (content: string, sources?: any[]) => void,
    onDone: () => void,
    onError: (err: any) => void
) {
    try {
        const lastMessage = messages[messages.length - 1];
        const userQuestion = lastMessage?.content || '';

        // 1. 修改请求地址
        // 假设你的后端 Controller 定义是 @GetMapping("/AnimeMaster/stream")
        const targetUrl = `${API_BASE_URL}/ai/AnimeMaster/stream?message=${encodeURIComponent(userQuestion)}`;

        console.log('开始流式请求:', targetUrl);

        // 2. 发起请求
        const response = await fetch(targetUrl, {
            method: 'GET', // 注意：流式接口通常是 GET，如果是 POST 请自行修改
            headers: {
                'Accept': 'text/event-stream', // 告诉后端我想接收流
            },
        });

        if (!response.ok || !response.body) {
            throw new Error(`接口报错: ${response.status} ${response.statusText}`);
        }

        // 3. 初始化流读取器
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        // 4. 循环读取流数据
        while (true) {
            // read() 会返回 { done: boolean, value: Uint8Array }
            const { done, value } = await reader.read();

            if (done) {
                console.log('流式传输结束');
                break;
            }

            // 解码二进制数据
            const chunk = decoder.decode(value, { stream: true });

            // 5. 处理 SSE 格式数据 (Spring Flux 默认格式)
            // 后端传来的数据通常长这样: "data:你好\n\ndata:世界\n\n"
            const lines = chunk.split('\n');

            for (const line of lines) {
                // 只处理以 data: 开头的行，并去除空行
                if (line.startsWith('data:')) {
                    // 去掉 "data:" 前缀
                    const content = line.slice(5);

                    // 如果后端发来的是结束标记 (有些实现会发 [DONE])，可以在这里判断
                    // if (content.trim() === '[DONE]') break;

                    // 回调给界面显示
                    if (content) {
                        onChunk(content, []);
                    }
                }
                    // 兼容性处理：如果后端没发 standard SSE，而是发原生 raw string
                // 那么 line 就没有 data: 前缀，直接显示即可
                else if (line.trim() !== '') {
                    // 如果你的后端不仅没加 data: 甚至连换行都没加，这里可能要慎重
                    // 但 Spring WebFlux 这里通常比较规范，为了保险可以加上这句：
                    onChunk(line, []);
                }
            }
        }

        // 6. 结束
        onDone();

    } catch (error) {
        console.error('流式请求失败:', error);
        onError(error);
    }
}