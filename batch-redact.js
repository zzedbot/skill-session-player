#!/usr/bin/env node
/**
 * 批量脱敏工具
 * 用法：
 *   node batch-redact.js --all          # 处理所有文件
 *   node batch-redact.js --days=7       # 处理最近 7 天
 *   node batch-redact.js <session-id>   # 处理指定文件
 */

const fs = require('fs');
const path = require('path');
const Redactor = require('./lib/redactor');

const RECORDINGS_DIR = path.join(__dirname, 'recordings');
const METADATA_PATH = path.join(RECORDINGS_DIR, 'metadata.json');

// 初始化脱敏器
const redactor = new Redactor();

if (!redactor.config.enabled) {
    console.log('⚠️  脱敏功能未启用');
    console.log('请复制并配置 config/redact-rules.json');
    console.log('  cp config/redact-rules.example.json config/redact-rules.json');
    console.log('  vim config/redact-rules.json');
    process.exit(1);
}

// 解析命令行参数
const args = process.argv.slice(2);
let mode = 'all';
let days = 0;
let sessionIds = [];

for (const arg of args) {
    if (arg === '--all') {
        mode = 'all';
    } else if (arg.startsWith('--days=')) {
        mode = 'days';
        days = parseInt(arg.split('=')[1], 10);
    } else if (!arg.startsWith('-')) {
        sessionIds.push(arg);
        mode = 'specific';
    }
}

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║       🔒 批量脱敏工具                                     ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

// 读取元数据
let metadata = {};
if (fs.existsSync(METADATA_PATH)) {
    metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
}

// 查找要处理的文件
let filesToProcess = [];

if (mode === 'all') {
    console.log('📂 模式：处理所有录制文件\n');
    filesToProcess = Object.keys(metadata).filter(f => f.endsWith('-full.json'));
} else if (mode === 'days') {
    console.log(`📂 模式：处理最近 ${days} 天的录制文件\n`);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    filesToProcess = Object.keys(metadata).filter(f => {
        if (!f.endsWith('-full.json')) return false;
        const meta = metadata[f];
        const createdAt = new Date(meta.createdAt);
        return createdAt >= cutoffDate;
    });
} else if (mode === 'specific') {
    console.log(`📂 模式：处理指定的 ${sessionIds.length} 个文件\n`);
    filesToProcess = sessionIds.map(id => {
        if (id.endsWith('-full.json')) {
            return id;
        }
        return `${id}-full.json`;
    });
}

console.log(`找到 ${filesToProcess.length} 个文件需要处理\n`);

// 处理文件
let processed = 0;
let skipped = 0;
let errors = 0;

for (const filename of filesToProcess) {
    const redactedFilename = filename.replace('-full.json', '-redacted.json');
    
    // 查找文件实际位置
    const fileMeta = metadata[filename];
    const category = fileMeta?.category || 'uncategorized';
    const filePath = path.join(RECORDINGS_DIR, category, filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  跳过：${filename} (文件不存在)`);
        skipped++;
        continue;
    }
    
    const redactedPath = path.join(RECORDINGS_DIR, category, redactedFilename);
    
    // 检查脱敏版是否已存在
    if (fs.existsSync(redactedPath)) {
        console.log(`⏭️  跳过：${filename} (脱敏版已存在)`);
        skipped++;
        continue;
    }
    
    try {
        // 读取原版文件
        const recording = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // 生成脱敏版
        const redactedRecording = redactor.redactObject(recording);
        
        // 保存脱敏版
        fs.writeFileSync(redactedPath, JSON.stringify(redactedRecording, null, 2), 'utf8');
        
        // 更新元数据
        if (!metadata[filename]) {
            metadata[filename] = {
                originalFilename: filename,
                customTitle: filename.replace('.json', ''),
                category,
                tags: [],
                note: '',
                starred: false,
                redactedVersion: redactedFilename,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } else {
            metadata[filename].redactedVersion = redactedFilename;
            metadata[filename].updatedAt = new Date().toISOString();
        }
        
        // 统计脱敏信息
        const originalText = JSON.stringify(recording, null, 2);
        const redactedText = JSON.stringify(redactedRecording, null, 2);
        const stats = redactor.getStats(originalText, redactedText);
        
        console.log(`✅ 脱敏：${filename}`);
        console.log(`   → ${redactedFilename}`);
        if (stats.replacements.length > 0) {
            stats.replacements.forEach(stat => {
                console.log(`   - ${stat.rule}: ${stat.count} 处`);
            });
        }
        console.log('');
        
        processed++;
    } catch (error) {
        console.error(`❌ 失败：${filename}`);
        console.error(`   错误：${error.message}`);
        console.log('');
        errors++;
    }
}

// 保存元数据
fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2), 'utf8');

// 输出统计
console.log('═'.repeat(60));
console.log('📊 处理完成统计：');
console.log(`   成功：${processed} 个文件`);
console.log(`   跳过：${skipped} 个文件`);
console.log(`   失败：${errors} 个文件`);
console.log('═'.repeat(60));
console.log('');
console.log('✨ 批量脱敏完成！\n');
