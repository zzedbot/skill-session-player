#!/usr/bin/env node
/**
 * 数据迁移脚本：将现有录制文件迁移到分类系统
 * 用法：node migrate-to-categories.js
 */

const fs = require('fs');
const path = require('path');

const RECORDINGS_DIR = path.join(__dirname, 'recordings');
const METADATA_PATH = path.join(RECORDINGS_DIR, 'metadata.json');
const UNCATEGORIZED_DIR = path.join(RECORDINGS_DIR, 'uncategorized');

console.log('🚀 开始迁移录制文件到分类系统...\n');

// 确保 uncategorized 目录存在
if (!fs.existsSync(UNCATEGORIZED_DIR)) {
    fs.mkdirSync(UNCATEGORIZED_DIR, { recursive: true });
    console.log('✅ 创建 uncategorized 目录');
}

// 读取现有元数据（如果存在）
let metadata = {};
if (fs.existsSync(METADATA_PATH)) {
    metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
    console.log('📖 读取现有元数据文件');
}

// 扫描 recordings 目录
const files = fs.readdirSync(RECORDINGS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'metadata.json');

console.log(`📂 发现 ${files.length} 个录制文件\n`);

// 迁移每个文件
let migrated = 0;
let skipped = 0;

files.forEach(filename => {
    const oldPath = path.join(RECORDINGS_DIR, filename);
    const newPath = path.join(UNCATEGORIZED_DIR, filename);
    
    try {
        // 检查文件是否已经在正确位置
        if (oldPath.includes('uncategorized')) {
            console.log(`⏭️  跳过：${filename} (已在 uncategorized)`);
            skipped++;
            return;
        }
        
        // 移动文件
        fs.renameSync(oldPath, newPath);
        
        // 创建或更新元数据
        if (!metadata[filename]) {
            metadata[filename] = {
                originalFilename: filename,
                customTitle: filename.replace('.json', ''),
                category: 'uncategorized',
                tags: [],
                note: '',
                starred: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }
        
        console.log(`✅ 迁移：${filename} → uncategorized/`);
        migrated++;
        
    } catch (error) {
        console.error(`❌ 失败：${filename} - ${error.message}`);
    }
});

// 保存元数据
fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2), 'utf8');
console.log('\n✅ 保存元数据文件 metadata.json');

// 输出统计
console.log('\n' + '='.repeat(50));
console.log('📊 迁移完成统计：');
console.log(`   迁移成功：${migrated} 个文件`);
console.log(`   跳过：${skipped} 个文件`);
console.log(`   元数据记录：${Object.keys(metadata).length} 条`);
console.log('='.repeat(50));
console.log('\n✨ 迁移完成！请重启服务器以应用更改。\n');
