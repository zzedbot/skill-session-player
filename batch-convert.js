#!/usr/bin/env node
/**
 * OpenClaw 批量会话转换器
 * 用法：node batch-convert.js [选项]
 * 
 * 选项:
 *   --limit <n>     限制转换的会话数量（默认：全部）
 *   --days <n>      仅转换最近 n 天的会话（默认：7）
 *   --session <id>  转换指定会话 ID（可重复）
 *   --dry-run       预览模式，不实际转换
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SESSIONS_DIR = '/root/.openclaw/agents/main/sessions';
const CONVERT_SCRIPT = path.join(__dirname, 'convert-jsonl.js');

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
    limit: null,
    days: 7,
    sessions: [],
    dryRun: false
};

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
        options.limit = parseInt(args[++i], 10);
    } else if (args[i] === '--days' && args[i + 1]) {
        options.days = parseInt(args[++i], 10);
    } else if (args[i] === '--session' && args[i + 1]) {
        options.sessions.push(args[++i]);
    } else if (args[i] === '--dry-run') {
        options.dryRun = true;
    }
}

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║       🔄 OpenClaw 批量会话转换器                          ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

// 获取会话文件列表
function getSessionFiles() {
    if (!fs.existsSync(SESSIONS_DIR)) {
        console.error(`❌ 会话目录不存在：${SESSIONS_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => {
            const filePath = path.join(SESSIONS_DIR, f);
            const stats = fs.statSync(filePath);
            return {
                filename: f,
                sessionId: f.replace('.jsonl', ''),
                path: filePath,
                mtime: stats.mtime,
                size: stats.size
            };
        });

    // 如果指定了会话 ID，只处理这些
    if (options.sessions.length > 0) {
        return files.filter(f => options.sessions.includes(f.sessionId));
    }

    // 按时间排序（最新的在前）
    files.sort((a, b) => b.mtime - a.mtime);

    // 过滤天数
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.days);
    const filtered = files.filter(f => f.mtime >= cutoffDate);

    // 限制数量
    if (options.limit && filtered.length > options.limit) {
        return filtered.slice(0, options.limit);
    }

    return filtered;
}

// 转换单个会话
function convertSession(sessionFile) {
    const sessionId = sessionFile.sessionId;
    const outputPath = path.join(__dirname, 'recordings', `${sessionId}-full.json`);
    
    // 检查是否已存在
    if (fs.existsSync(outputPath)) {
        console.log(`⏭️  跳过（已存在）: ${sessionId}`);
        return { skipped: true };
    }

    if (options.dryRun) {
        console.log(`📋 预览：${sessionId} (${(sessionFile.size / 1024).toFixed(1)} KB)`);
        return { dryRun: true };
    }

    try {
        execSync(`node "${CONVERT_SCRIPT}" "${sessionId}"`, {
            stdio: 'pipe',
            cwd: __dirname
        });
        console.log(`✅ 转换成功：${sessionId}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ 转换失败：${sessionId}`);
        console.error(`   ${error.message}`);
        return { error: true };
    }
}

// 主流程
const sessionFiles = getSessionFiles();

console.log(`📁 会话目录：${SESSIONS_DIR}`);
console.log(`📂 录制输出：${path.join(__dirname, 'recordings')}`);
console.log(`📊 找到 ${sessionFiles.length} 个会话文件`);
console.log('');

if (sessionFiles.length === 0) {
    console.log('✨ 没有需要转换的会话');
    process.exit(0);
}

if (options.dryRun) {
    console.log('🔍 预览模式（不会实际转换）');
    console.log('');
}

console.log('开始转换...');
console.log('');

const results = {
    success: 0,
    skipped: 0,
    error: 0,
    dryRun: 0
};

sessionFiles.forEach((file, index) => {
    console.log(`[${index + 1}/${sessionFiles.length}]`);
    const result = convertSession(file);
    
    if (result.success) results.success++;
    if (result.skipped) results.skipped++;
    if (result.error) results.error++;
    if (result.dryRun) results.dryRun++;
});

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║                    转换完成统计                           ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
console.log(`✅ 成功：${results.success}`);
console.log(`⏭️  跳过：${results.skipped}`);
if (results.error > 0) {
    console.log(`❌ 失败：${results.error}`);
}
if (results.dryRun > 0) {
    console.log(`📋 预览：${results.dryRun}`);
}
console.log('');
