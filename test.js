#!/usr/bin/env node
/**
 * Session Player 功能测试脚本
 * 用法：node test.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const RECORDINGS_DIR = path.join(__dirname, 'recordings');
const PORT = process.env.PORT || 3000;

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║       🧪 Session Player 功能测试                          ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   错误：${error.message}`);
        failed++;
    }
}

// 1. 测试文件结构
console.log('📁 测试文件结构...');
test('convert-jsonl.js 存在', () => {
    if (!fs.existsSync(path.join(__dirname, 'convert-jsonl.js'))) {
        throw new Error('文件不存在');
    }
});

test('batch-convert.js 存在', () => {
    if (!fs.existsSync(path.join(__dirname, 'batch-convert.js'))) {
        throw new Error('文件不存在');
    }
});

test('server.js 存在', () => {
    if (!fs.existsSync(path.join(__dirname, 'server.js'))) {
        throw new Error('文件不存在');
    }
});

test('index.html 存在', () => {
    if (!fs.existsSync(path.join(__dirname, 'index.html'))) {
        throw new Error('文件不存在');
    }
});

test('player.html 存在', () => {
    if (!fs.existsSync(path.join(__dirname, 'player.html'))) {
        throw new Error('文件不存在');
    }
});

test('recordings 目录存在', () => {
    if (!fs.existsSync(RECORDINGS_DIR)) {
        throw new Error('目录不存在');
    }
});

// 2. 测试录制文件
console.log('');
console.log('📼 测试录制文件...');
test('录制目录不为空', () => {
    const files = fs.readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
        throw new Error('录制目录为空');
    }
});

test('录制文件格式正确', () => {
    const files = fs.readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.json'));
    if (files.length > 0) {
        const content = JSON.parse(fs.readFileSync(path.join(RECORDINGS_DIR, files[0]), 'utf8'));
        if (!content.recordingInfo || !content.messages) {
            throw new Error('录制文件格式不正确');
        }
    }
});

// 3. 测试服务器 API
console.log('');
console.log('🌐 测试服务器 API...');

function httpGet(urlPath) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:${PORT}${urlPath}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: data });
                }
            });
        }).on('error', reject);
    });
}

async function runApiTests() {
    try {
        const listResult = await httpGet('/api/recordings');
        test('GET /api/recordings 返回成功', () => {
            if (listResult.statusCode !== 200) {
                throw new Error(`状态码：${listResult.statusCode}`);
            }
            if (!listResult.data.success) {
                throw new Error('API 返回失败');
            }
        });

        test('录制列表包含数据', () => {
            if (!listResult.data.recordings || listResult.data.recordings.length === 0) {
                throw new Error('录制列表为空');
            }
        });

        if (listResult.data.recordings && listResult.data.recordings.length > 0) {
            const firstFile = listResult.data.recordings[0].filename;
            const singleResult = await httpGet(`/api/recordings/${firstFile}`);
            
            test(`GET /api/recordings/${firstFile} 返回成功`, () => {
                if (singleResult.statusCode !== 200) {
                    throw new Error(`状态码：${singleResult.statusCode}`);
                }
                if (!singleResult.data.success) {
                    throw new Error('API 返回失败');
                }
            });
        }

        // 测试子路径支持
        const subPathResult = await httpGet('/session-player/api/recordings');
        test('GET /session-player/api/recordings 支持子路径', () => {
            if (subPathResult.statusCode !== 200) {
                throw new Error(`状态码：${subPathResult.statusCode}`);
            }
        });

    } catch (error) {
        console.log(`⚠️  API 测试跳过（服务器可能未运行）`);
        console.log(`   错误：${error.message}`);
    }
}

// 4. 测试 convert-jsonl.js 输出路径
console.log('');
console.log('🔧 测试转换脚本配置...');
test('convert-jsonl.js 使用正确的输出路径', () => {
    const content = fs.readFileSync(path.join(__dirname, 'convert-jsonl.js'), 'utf8');
    if (!content.includes('path.join(__dirname, \'recordings\'')) {
        throw new Error('输出路径配置不正确');
    }
});

// 5. 测试 server.js 路由配置
console.log('');
console.log('🛣️ 测试服务器路由配置...');
test('server.js 支持双路径 API', () => {
    const content = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    if (!content.includes("['/api/recordings', '/session-player/api/recordings']")) {
        throw new Error('双路径配置不存在');
    }
});

test('server.js 支持 DELETE 方法', () => {
    const content = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    if (!content.includes("app.delete")) {
        throw new Error('DELETE 路由不存在');
    }
});

// 6. 测试前端功能
console.log('');
console.log('🎨 测试前端功能...');
test('index.html 包含搜索功能', () => {
    const content = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    if (!content.includes('search-input') || !content.includes('filterRecordings')) {
        throw new Error('搜索功能不存在');
    }
});

test('index.html 包含删除功能', () => {
    const content = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    if (!content.includes('delete-btn') || !content.includes('confirmDelete')) {
        throw new Error('删除功能不存在');
    }
});

test('index.html 包含统计信息', () => {
    const content = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    if (!content.includes('stats-bar') || !content.includes('stat-total')) {
        throw new Error('统计功能不存在');
    }
});

test('player.html 支持自动路径检测', () => {
    const content = fs.readFileSync(path.join(__dirname, 'player.html'), 'utf8');
    if (!content.includes('getApiBase()') || !content.includes('API_BASE')) {
        throw new Error('自动路径检测不存在');
    }
});

// 运行 API 测试
runApiTests().then(() => {
    // 输出总结
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                      测试总结                             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ 通过：${passed}`);
    console.log(`❌ 失败：${failed}`);
    console.log('');

    if (failed === 0) {
        console.log('🎉 所有测试通过！');
        process.exit(0);
    } else {
        console.log('⚠️  部分测试失败，请检查上述错误。');
        process.exit(1);
    }
});
