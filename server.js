const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const RECORDINGS_DIR = path.join(__dirname, 'recordings');

// 确保录制目录存在
if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
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
        const files = fs.readdirSync(RECORDINGS_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const filePath = path.join(RECORDINGS_DIR, f);
                const stats = fs.statSync(filePath);
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                return {
                    filename: f,
                    name: f.replace('.json', ''),
                    size: stats.size,
                    createdAt: stats.birthtime,
                    recordingInfo: content.recordingInfo,
                    messageCount: content.messages?.length || 0
                };
            })
            .sort((a, b) => b.createdAt - a.createdAt);
        
        res.json({ success: true, recordings: files });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 通用处理函数 - 获取单个录制文件
const handleGetRecording = (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(RECORDINGS_DIR, filename);
        
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

// API 路由 - 支持两种路径模式
app.get(['/api/recordings', '/session-player/api/recordings'], handleRecordingsList);
app.get(['/api/recordings/:filename', '/session-player/api/recordings/:filename'], handleGetRecording);
app.delete(['/api/recordings/:filename', '/session-player/api/recordings/:filename'], handleDeleteRecording);

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
