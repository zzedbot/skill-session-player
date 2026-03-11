#!/usr/bin/env node
/**
 * OpenClaw JSONL 转录文件转录制格式转换器
 * 用法：node convert-jsonl.js <session-id>
 */

const fs = require('fs');
const path = require('path');

const SESSION_ID = process.argv[2] || 'ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f';
const JSONL_PATH = `/root/.openclaw/agents/main/sessions/${SESSION_ID}.jsonl`;
const OUTPUT_PATH = `/zed/workspace/recordings/recordings/${SESSION_ID}-full.json`;

console.log(`📖 读取 JSONL 文件：${JSONL_PATH}`);

if (!fs.existsSync(JSONL_PATH)) {
    console.error(`❌ 文件不存在：${JSONL_PATH}`);
    process.exit(1);
}

// 读取 JSONL 文件
const lines = fs.readFileSync(JSONL_PATH, 'utf8').trim().split('\n');
console.log(`📝 共 ${lines.length} 行记录`);

// 解析所有记录
const records = lines.map(line => JSON.parse(line));

// 提取会话信息
const sessionInfo = records.find(r => r.type === 'session');
const modelChange = records.find(r => r.type === 'model_change');

// 转换消息
const messages = [];

records.forEach((record, index) => {
    if (record.type === 'message' && record.message) {
        const msg = record.message;
        
        if (msg.role === 'user') {
            // 用户消息 - 需要清理 metadata
            let text = msg.content?.[0]?.text || '';
            
            // 清理 metadata JSON 块
            text = text.replace(/Sender \(untrusted metadata\):\s*```json\s*\{[^`]*\}\s*```\s*/g, '');
            
            // 清理时间戳行
            text = text.replace(/\[.*?GMT.*?\]\s*/g, '');
            
            // 清理空白行
            text = text.trim();
            
            if (text) {
                messages.push({
                    role: 'user',
                    content: text,
                    timestamp: new Date(msg.timestamp || record.timestamp).toISOString()
                });
            }
        } else if (msg.role === 'assistant') {
            // 助手消息 - 可能包含 thinking, toolCall, 和普通文本回复
            let hasContent = false;
            
            if (msg.content) {
                msg.content.forEach(item => {
                    if (item.type === 'thinking') {
                        messages.push({
                            role: 'assistant',
                            type: 'thinking',
                            content: item.thinking,
                            timestamp: new Date(msg.timestamp || record.timestamp).toISOString()
                        });
                        hasContent = true;
                    } else if (item.type === 'toolCall') {
                        messages.push({
                            role: 'assistant',
                            type: 'toolCall',
                            toolName: item.name,
                            toolCallId: item.id,
                            arguments: JSON.stringify(item.arguments, null, 2),
                            content: `🔧 调用工具：**${item.name}**\n\n参数：\n\`\`\`json\n${JSON.stringify(item.arguments, null, 2)}\n\`\`\``,
                            timestamp: new Date(msg.timestamp || record.timestamp).toISOString()
                        });
                        hasContent = true;
                    } else if (item.type === 'text' && item.text) {
                        // 普通文本回复
                        messages.push({
                            role: 'assistant',
                            type: 'text',
                            content: item.text,
                            timestamp: new Date(msg.timestamp || record.timestamp).toISOString()
                        });
                        hasContent = true;
                    }
                });
            }
            
            // 如果没有 content 但有 stopReason，可能是纯文本回复
            if (!hasContent && msg.stopReason === 'stop') {
                messages.push({
                    role: 'assistant',
                    type: 'text',
                    content: '[助手回复]',
                    timestamp: new Date(msg.timestamp || record.timestamp).toISOString()
                });
            }
        } else if (msg.role === 'toolResult') {
            // 工具结果
            const text = msg.content?.[0]?.text || '';
            messages.push({
                role: 'tool',
                toolName: msg.toolName,
                toolCallId: msg.toolCallId,
                content: text.length > 500 ? text.substring(0, 500) + '... (truncated)' : text,
                fullContent: text,
                isError: msg.isError || false,
                timestamp: new Date(msg.timestamp || record.timestamp).toISOString()
            });
        }
        // 跳过 system/api_response 消息，这些不需要显示
    }
});

console.log(`✨ 转换完成：${messages.length} 条消息`);

// 创建录制文件
const recording = {
    recordingInfo: {
        sessionId: sessionInfo?.id || SESSION_ID,
        sessionKey: 'agent:main:main',
        recordedAt: sessionInfo?.timestamp || new Date().toISOString(),
        channel: 'webchat',
        model: modelChange?.modelId || 'qwen3.5-plus',
        provider: modelChange?.provider || 'bailian',
        title: `完整会话录制 - ${SESSION_ID.substring(0, 8)}`,
        description: `1:1 完整转录，包含所有思考过程和工具调用`,
        totalMessages: messages.length,
        sourceFile: JSONL_PATH,
        sourceFileSize: fs.statSync(JSONL_PATH).size
    },
    messages: messages
};

// 确保输出目录存在
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 写入文件
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(recording, null, 2), 'utf8');
console.log(`💾 已保存到：${OUTPUT_PATH}`);
console.log(`📊 文件大小：${fs.statSync(OUTPUT_PATH).size} bytes`);

// 显示前几条消息预览
console.log('\n📋 消息预览：');
messages.slice(0, 5).forEach((msg, i) => {
    const preview = msg.content?.substring(0, 50) || msg.toolName || msg.type;
    console.log(`  ${i + 1}. [${msg.role}] ${preview}...`);
});

console.log('\n✅ 转换完成！');
