const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const RECORDINGS_DIR = path.join(__dirname, 'recordings');
const METADATA_PATH = path.join(RECORDINGS_DIR, 'metadata.json');

// 确保录制目录存在
if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// 初始化元数据文件
if (!fs.existsSync(METADATA_PATH)) {
    // 尝试从示例文件复制
    const examplePath = path.join(RECORDINGS_DIR, 'metadata.example.json');
    if (fs.existsSync(examplePath)) {
        const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
        // 只保留空 metadata 对象
        fs.writeFileSync(METADATA_PATH, JSON.stringify({}, null, 2), 'utf8');
        console.log('✅ 从示例文件创建 metadata.json');
    } else {
        fs.writeFileSync(METADATA_PATH, JSON.stringify({}, null, 2), 'utf8');
        console.log('✅ 创建空 metadata.json');
    }
}

app.use(express.json());

// 简单的 cookie 解析中间件
app.use((req, res, next) => {
    const cookies = {};
    if (req.headers.cookie) {
        req.headers.cookie.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            cookies[parts[0].trim()] = parts[1] ? parts[1].trim() : '';
        });
    }
    req.cookies = cookies;
    next();
});

// ==================== 认证 API（在静态文件之前定义）====================

// 发送验证码
app.post(['/api/auth/send-code', '/session-player/api/auth/send-code'], async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: '请提供邮箱地址' });
        }

        if (email !== auth.ALLOWED_EMAIL) {
            return res.status(403).json({ success: false, message: '仅允许使用 geolle@163.com 登录' });
        }

        await auth.sendVerificationCode(email);
        res.json({ success: true, message: '验证码已发送' });
    } catch (error) {
        console.error('发送验证码失败:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 验证验证码并创建会话
app.post(['/api/auth/verify', '/session-player/api/auth/verify'], (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, message: '请提供邮箱和验证码' });
        }

        if (email !== auth.ALLOWED_EMAIL) {
            return res.status(403).json({ success: false, message: '仅允许使用 geolle@163.com 登录' });
        }

        const verification = auth.verifyCode(email, code);
        
        if (!verification.valid) {
            return res.status(400).json({ success: false, message: verification.message });
        }

        // 创建会话
        const sessionId = auth.createSession(email);
        
        res.json({ 
            success: true, 
            message: '登录成功',
            sessionId: sessionId
        });
    } catch (error) {
        console.error('验证失败:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 检查会话状态
app.get(['/api/auth/check', '/session-player/api/auth/check'], (req, res) => {
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    
    if (!sessionId) {
        return res.json({ valid: false, message: '未登录' });
    }

    const validation = auth.validateSession(sessionId);
    
    if (validation.valid) {
        res.json({ valid: true, email: validation.email });
    } else {
        res.json({ valid: false, message: validation.message });
    }
});

// 登出
app.post(['/api/auth/logout', '/session-player/api/auth/logout'], (req, res) => {
    const sessionId = req.cookies?.session_id;
    
    if (sessionId) {
        auth.destroySession(sessionId);
    }
    
    res.json({ success: true, message: '已登出' });
});

// ==================== 认证中间件 ====================

// 认证中间件 - 保护需要登录的页面
function requireAuth(req, res, next) {
    // 公开路径（不需要认证）
    const publicPaths = ['/login.html', '/api/'];
    if (publicPaths.some(p => req.path.startsWith(p))) {
        return next();
    }

    // 检查会话
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    
    if (!sessionId) {
        // API 请求返回 JSON，其他重定向到登录页
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ success: false, message: '未授权访问' });
        }
        return res.redirect('/session-player/login.html');
    }

    const validation = auth.validateSession(sessionId);
    if (!validation.valid) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ success: false, message: validation.message });
        }
        return res.redirect('/session-player/login.html');
    }

    // 附加用户信息到请求
    req.user = { email: validation.email };
    next();
}

// 应用认证中间件（仅保护页面路由，API 路由已在前定义）
app.use(requireAuth);

// 静态文件服务（认证后）
app.use(express.static(__dirname, {
    fallthrough: true  // 允许传递给后续路由
}));

// ==================== 录制文件 API ====================

// 通用处理函数 - 获取所有录制文件列表
const handleRecordingsList = (req, res) => {
    try {
        const { category, tag, starred } = req.query;
        
        // 读取元数据
        let metadata = {};
        if (fs.existsSync(METADATA_PATH)) {
            metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
        }
        
        // 获取所有分类目录
        const categories = fs.readdirSync(RECORDINGS_DIR)
            .filter(item => {
                const itemPath = path.join(RECORDINGS_DIR, item);
                return fs.statSync(itemPath).isDirectory() && item !== 'node_modules';
            });
        
        // 扫描所有分类目录中的文件
        const files = [];
        categories.forEach(cat => {
            const catPath = path.join(RECORDINGS_DIR, cat);
            const catFiles = fs.readdirSync(catPath)
                .filter(f => f.endsWith('.json'))
                .map(f => ({ filename: f, category: cat, path: path.join(catPath, f) }));
            files.push(...catFiles);
        });
        
        // 构建录制列表
        const recordings = files
            .map(({ filename, category, path: filePath }) => {
                const stats = fs.statSync(filePath);
                const meta = metadata[filename] || {};
                
                return {
                    filename,
                    name: meta.customTitle || filename.replace('.json', ''),
                    category: meta.category || category,
                    tags: meta.tags || [],
                    note: meta.note || '',
                    starred: meta.starred || false,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    recordingInfo: null, // 不加载完整内容，提高性能
                    messageCount: 0
                };
            })
            .filter(rec => {
                // 应用筛选
                if (category && category !== 'all' && rec.category !== category) {
                    return false;
                }
                if (tag && tag !== 'all' && !rec.tags.includes(tag)) {
                    return false;
                }
                if (starred === 'true' && !rec.starred) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => b.createdAt - a.createdAt);
        
        res.json({ success: true, recordings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 通用处理函数 - 获取单个录制文件
const handleGetRecording = (req, res) => {
    try {
        const filename = req.params.filename;
        
        // 读取元数据查找文件实际位置
        let metadata = {};
        if (fs.existsSync(METADATA_PATH)) {
            metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
        }
        
        const fileMeta = metadata[filename];
        const category = fileMeta?.category || 'uncategorized';
        const filePath = path.join(RECORDINGS_DIR, category, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: '文件不存在' });
        }
        
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json({ success: true, recording: content });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 通用处理函数 - 删除录制文件
const handleDeleteRecording = (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(RECORDINGS_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: '文件不存在' });
        }
        
        fs.unlinkSync(filePath);
        res.json({ success: true, message: `已删除 ${filename}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 通用处理函数 - 重命名录制文件
const handleRenameRecording = (req, res) => {
    try {
        const { filename, newName } = req.body;
        
        if (!filename || !newName) {
            return res.status(400).json({ success: false, error: '请提供文件名和新名称' });
        }
        
        const oldPath = path.join(RECORDINGS_DIR, filename);
        const newPath = path.join(RECORDINGS_DIR, newName);
        
        if (!fs.existsSync(oldPath)) {
            return res.status(404).json({ success: false, error: '文件不存在' });
        }
        
        if (fs.existsSync(newPath)) {
            return res.status(400).json({ success: false, error: '目标文件名已存在' });
        }
        
        fs.renameSync(oldPath, newPath);
        res.json({ success: true, message: `已重命名为 ${newName}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 通用处理函数 - 更新元数据
const handleUpdateMetadata = (req, res) => {
    try {
        const { filename, customTitle, category, tags, note, starred } = req.body;
        
        if (!filename) {
            return res.status(400).json({ success: false, error: '请提供文件名' });
        }
        
        // 读取元数据
        let metadata = {};
        if (fs.existsSync(METADATA_PATH)) {
            metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
        }
        
        // 更新或创建元数据
        if (!metadata[filename]) {
            metadata[filename] = {
                originalFilename: filename,
                customTitle: customTitle || filename.replace('.json', ''),
                category: category || 'uncategorized',
                tags: tags || [],
                note: note || '',
                starred: starred || false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } else {
            metadata[filename].customTitle = customTitle !== undefined ? customTitle : metadata[filename].customTitle;
            metadata[filename].category = category !== undefined ? category : metadata[filename].category;
            metadata[filename].tags = tags !== undefined ? tags : metadata[filename].tags;
            metadata[filename].note = note !== undefined ? note : metadata[filename].note;
            metadata[filename].starred = starred !== undefined ? starred : metadata[filename].starred;
            metadata[filename].updatedAt = new Date().toISOString();
        }
        
        // 如果分类变更，需要移动文件
        if (category && metadata[filename].category !== 'uncategorized') {
            const targetDir = path.join(RECORDINGS_DIR, category);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            
            const oldPath = path.join(RECORDINGS_DIR, filename);
            const newPath = path.join(targetDir, filename);
            
            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
            }
        }
        
        // 保存元数据
        fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2), 'utf8');
        
        res.json({ success: true, metadata: metadata[filename] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 通用处理函数 - 获取所有分类
const handleGetCategories = (req, res) => {
    try {
        const items = fs.readdirSync(RECORDINGS_DIR);
        const categories = items.filter(item => {
            const itemPath = path.join(RECORDINGS_DIR, item);
            return fs.statSync(itemPath).isDirectory() && item !== 'node_modules';
        });
        
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 通用处理函数 - 创建分类
const handleCreateCategory = (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: '请提供分类名称' });
        }
        
        // 验证分类名称
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            return res.status(400).json({ success: false, error: '分类名称只能包含字母、数字、连字符和下划线' });
        }
        
        const categoryPath = path.join(RECORDINGS_DIR, name);
        
        if (fs.existsSync(categoryPath)) {
            return res.status(400).json({ success: false, error: '分类已存在' });
        }
        
        fs.mkdirSync(categoryPath, { recursive: true });
        res.json({ success: true, name });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 通用处理函数 - 获取所有标签
const handleGetTags = (req, res) => {
    try {
        let metadata = {};
        if (fs.existsSync(METADATA_PATH)) {
            metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
        }
        
        // 收集所有标签
        const tagSet = new Set();
        Object.values(metadata).forEach(meta => {
            if (meta.tags && Array.isArray(meta.tags)) {
                meta.tags.forEach(tag => tagSet.add(tag));
            }
        });
        
        res.json({ success: true, tags: Array.from(tagSet) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 通用处理函数 - 移动文件到另一个分类
const handleMoveRecording = (req, res) => {
    try {
        const { filename, targetCategory } = req.body;
        
        if (!filename || !targetCategory) {
            return res.status(400).json({ success: false, error: '请提供文件名和目标分类' });
        }
        
        // 读取元数据
        let metadata = {};
        if (fs.existsSync(METADATA_PATH)) {
            metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
        }
        
        // 查找文件当前分类
        const currentMeta = metadata[filename];
        const currentCategory = currentMeta?.category || 'uncategorized';
        
        // 如果目标分类相同，直接返回
        if (targetCategory === currentCategory) {
            return res.json({ success: true, message: '文件已在目标分类中' });
        }
        
        // 构建源路径和目标路径
        const sourceDir = path.join(RECORDINGS_DIR, currentCategory);
        const targetDir = path.join(RECORDINGS_DIR, targetCategory);
        const sourcePath = path.join(sourceDir, filename);
        const targetPath = path.join(targetDir, filename);
        
        // 检查源文件是否存在
        if (!fs.existsSync(sourcePath)) {
            return res.status(404).json({ success: false, error: '文件不存在' });
        }
        
        // 确保目标目录存在
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // 检查目标文件是否已存在
        if (fs.existsSync(targetPath)) {
            return res.status(400).json({ success: false, error: '目标分类中已存在同名文件' });
        }
        
        // 移动文件
        fs.renameSync(sourcePath, targetPath);
        
        // 更新元数据
        if (!metadata[filename]) {
            metadata[filename] = {
                originalFilename: filename,
                customTitle: filename.replace('.json', ''),
                category: targetCategory,
                tags: [],
                note: '',
                starred: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } else {
            metadata[filename].category = targetCategory;
            metadata[filename].updatedAt = new Date().toISOString();
        }
        
        // 保存元数据
        fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2), 'utf8');
        
        res.json({ 
            success: true, 
            message: `已移动到分类 "${targetCategory}"`,
            filename,
            fromCategory: currentCategory,
            toCategory: targetCategory
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// API 路由 - 支持两种路径模式
app.get(['/api/recordings', '/session-player/api/recordings'], handleRecordingsList);
app.get(['/api/recordings/:filename', '/session-player/api/recordings/:filename'], handleGetRecording);
app.delete(['/api/recordings/:filename', '/session-player/api/recordings/:filename'], handleDeleteRecording);

// 重命名 API - 分开定义两个路由
app.put('/api/recordings/rename', handleRenameRecording);
app.put('/session-player/api/recordings/rename', handleRenameRecording);

// 元数据 API
app.put(['/api/recordings/:filename/metadata', '/session-player/api/recordings/:filename/metadata'], handleUpdateMetadata);

// 分类管理 API
app.get(['/api/categories', '/session-player/api/categories'], handleGetCategories);
app.post(['/api/categories', '/session-player/api/categories'], handleCreateCategory);

// 标签管理 API
app.get(['/api/tags', '/session-player/api/tags'], handleGetTags);

// 移动文件 API
app.put(['/api/recordings/:filename/move', '/session-player/api/recordings/:filename/move'], handleMoveRecording);

// 主页 - 支持两种路径
app.get(['/', '/session-player/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 播放器页面 - 支持两种路径
app.get(['/player/:filename', '/session-player/player/:filename'], (req, res) => {
    res.sendFile(path.join(__dirname, 'player.html'));
});

// 登录页面 - 支持两种路径（公开访问）
app.get(['/login.html', '/session-player/login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: '未找到',
        availableRoutes: [
            'GET  /                    - 录制库首页（需认证）',
            'GET  /login.html          - 登录页面',
            'POST /api/auth/send-code  - 发送验证码',
            'POST /api/auth/verify     - 验证登录',
            'GET  /api/auth/check      - 检查会话',
            'POST /api/auth/logout     - 登出',
            'GET  /api/recordings      - 获取录制列表',
            'GET  /api/recordings/:id  - 获取单个录制',
            'DELETE /api/recordings/:id - 删除录制',
            'GET  /player/:id          - 播放器页面'
        ]
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       🎬 OpenClaw 会话回放服务器已启动                    ║');
    console.log('║       🔐 已启用邮箱验证码登录认证                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📡 服务器地址：http://localhost:${PORT}`);
    console.log(`🔒 登录页面：http://localhost:${PORT}/session-player/login.html`);
    console.log(`📁 录制目录：${RECORDINGS_DIR}`);
    console.log('');
    console.log('可用路由:');
    console.log('  GET  /                    - 录制库首页（需认证）');
    console.log('  GET  /login.html          - 登录页面');
    console.log('  POST /api/auth/send-code  - 发送验证码');
    console.log('  POST /api/auth/verify     - 验证登录');
    console.log('  GET  /api/auth/check      - 检查会话');
    console.log('  POST /api/auth/logout     - 登出');
    console.log('  GET  /api/recordings      - 获取录制列表');
    console.log('  GET  /api/recordings/:id  - 获取单个录制');
    console.log('  DELETE /api/recordings/:id - 删除录制');
    console.log('  GET  /player/:id          - 播放器页面');
    console.log('');
    console.log('按 Ctrl+C 停止服务器');
    console.log('');
});
