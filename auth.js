/**
 * Session Player 认证模块
 * 功能：邮箱验证码登录
 * 配置：从 config/config.json 读取 allowedEmail
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// 允许邮箱（从配置读取，如果配置不存在则使用空字符串）
let ALLOWED_EMAIL = '';

// 加载配置文件
const configPath = path.join(__dirname, 'config', 'config.json');
let config = {};

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // 从配置读取
    ALLOWED_EMAIL = config.email?.allowedEmail || '';
} catch (error) {
    console.warn('⚠️  读取配置文件失败，将不允许任何邮箱登录（需要配置 config/config.json）');
}

// 从配置读取其他配置项
const SMTP_CONFIG = config.email?.smtp || {};
const FROM_EMAIL = config.email?.from || '';
const SESSION_EXPIRY_DAYS = config.session?.expiryDays || 7;
const CODE_EXPIRY_MINUTES = config.verificationCode?.expiryMinutes || 5;

// 内存存储验证码和会话（生产环境建议使用 Redis）
const verificationCodes = new Map(); // email -> {code, expiresAt}
const activeSessions = new Map(); // sessionId -> {email, createdAt}

// 生成 6 位数字验证码
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 生成会话 ID
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

// 创建邮件发送器
function createTransporter() {
    return nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        secure: SMTP_CONFIG.secure,
        auth: {
            user: SMTP_CONFIG.user,
            pass: SMTP_CONFIG.pass
        }
    });
}

// 发送验证码邮件
async function sendVerificationCode(email) {
    // 验证邮箱
    if (email !== ALLOWED_EMAIL) {
        throw new Error('不允许的邮箱地址');
    }

    // 生成验证码
    const code = generateCode();
    const expiresAt = Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000;

    // 存储验证码
    verificationCodes.set(email, { code, expiresAt });

    // 发送邮件
    const transporter = createTransporter();
    
    const mailOptions = {
        from: FROM_EMAIL,
        to: email,
        subject: '🎬 Session Player 登录验证码',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            padding: 40px 20px;
            margin: 0;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        h1 {
            color: #1a1a2e;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
        }
        .code-box {
            background: linear-gradient(135deg, #00d9ff, #00ff88);
            color: #1a1a2e;
            font-size: 2.5rem;
            font-weight: 700;
            text-align: center;
            padding: 20px;
            border-radius: 12px;
            margin: 30px 0;
            letter-spacing: 8px;
        }
        .info {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 0.9rem;
            color: #666;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            font-size: 0.9rem;
            color: #856404;
        }
        .footer {
            text-align: center;
            color: #999;
            font-size: 0.85rem;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 Session Player</h1>
        <p class="subtitle">登录验证码</p>
        
        <p>您好！</p>
        <p>您正在登录 Session Player 会话回放系统，请使用以下验证码完成登录：</p>
        
        <div class="code-box">${code}</div>
        
        <div class="info">
            <strong>验证码说明：</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>有效期：5 分钟</li>
                <li>仅限本次登录使用</li>
                <li>不要分享给任何人</li>
            </ul>
        </div>
        
        <div class="warning">
            ⚠️ <strong>安全提示：</strong>如果您没有请求登录，请忽略此邮件，验证码将自动过期。
        </div>
        
        <div class="footer">
            <p>此邮件由 Session Player 系统自动发送</p>
            <p>© 2026 OpenClaw Session Player</p>
        </div>
    </div>
</body>
</html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ 验证码邮件已发送：${email}`);
        return { success: true };
    } catch (error) {
        console.error('❌ 发送邮件失败:', error.message);
        throw new Error('发送邮件失败，请稍后重试');
    }
}

// 验证验证码
function verifyCode(email, code) {
    const stored = verificationCodes.get(email);
    
    if (!stored) {
        return { valid: false, message: '请先获取验证码' };
    }
    
    if (Date.now() > stored.expiresAt) {
        verificationCodes.delete(email);
        return { valid: false, message: '验证码已过期，请重新获取' };
    }
    
    if (stored.code !== code) {
        return { valid: false, message: '验证码错误' };
    }
    
    // 验证成功后删除验证码（一次性使用）
    verificationCodes.delete(email);
    
    return { valid: true, message: '验证成功' };
}

// 创建会话
function createSession(email) {
    const sessionId = generateSessionId();
    activeSessions.set(sessionId, {
        email,
        createdAt: Date.now()
    });
    
    return sessionId;
}

// 验证会话
function validateSession(sessionId) {
    const session = activeSessions.get(sessionId);
    
    if (!session) {
        return { valid: false, message: '会话不存在' };
    }
    
    // 会话有效期（从配置读取）
    const expiresAt = session.createdAt + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() > expiresAt) {
        activeSessions.delete(sessionId);
        return { valid: false, message: '会话已过期，请重新登录' };
    }
    
    return { valid: true, email: session.email };
}

// 销毁会话
function destroySession(sessionId) {
    return activeSessions.delete(sessionId);
}

// 清理过期的验证码和会话
function cleanup() {
    const now = Date.now();
    
    // 清理过期验证码
    for (const [email, data] of verificationCodes.entries()) {
        if (now > data.expiresAt) {
            verificationCodes.delete(email);
        }
    }
    
    // 清理过期会话（从配置读取）
    const sessionExpiry = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    for (const [id, data] of activeSessions.entries()) {
        if (now - data.createdAt > sessionExpiry) {
            activeSessions.delete(id);
        }
    }
}

// 每小时清理一次
setInterval(cleanup, 60 * 60 * 1000);

module.exports = {
    ALLOWED_EMAIL,
    sendVerificationCode,
    verifyCode,
    createSession,
    validateSession,
    destroySession,
    cleanup
};
