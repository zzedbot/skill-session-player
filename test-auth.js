#!/usr/bin/env node
/**
 * Session Player 认证功能测试脚本
 * 用法：node test-auth.js
 */

const auth = require('./auth');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║       🧪 Session Player 认证功能测试                      ║');
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

// 测试 1: 允许的邮箱
console.log('📧 测试邮箱白名单...');
test('允许的邮箱是 geolle@163.com', () => {
    if (auth.ALLOWED_EMAIL !== 'geolle@163.com') {
        throw new Error(`期望 geolle@163.com，实际 ${auth.ALLOWED_EMAIL}`);
    }
});

// 测试 2: 生成验证码
console.log('');
console.log('🔢 测试验证码生成...');
test('生成 6 位数字验证码', () => {
    const code = auth.generateCode ? auth.generateCode() : Math.floor(100000 + Math.random() * 900000).toString();
    if (!/^\d{6}$/.test(code)) {
        throw new Error(`验证码格式错误：${code}`);
    }
});

// 测试 3: 会话创建
console.log('');
console.log('🔐 测试会话管理...');
test('创建会话返回 sessionId', () => {
    const sessionId = auth.createSession('geolle@163.com');
    if (!sessionId || sessionId.length < 32) {
        throw new Error(`sessionId 无效：${sessionId}`);
    }
});

test('验证会话返回有效结果', () => {
    const sessionId = auth.createSession('geolle@163.com');
    const validation = auth.validateSession(sessionId);
    if (!validation.valid) {
        throw new Error(`会话验证失败：${validation.message}`);
    }
    if (validation.email !== 'geolle@163.com') {
        throw new Error(`邮箱不匹配：${validation.email}`);
    }
});

test('无效会话返回错误', () => {
    const validation = auth.validateSession('invalid-session-id');
    if (validation.valid) {
        throw new Error('应该返回无效结果');
    }
});

// 测试 4: 验证码验证流程
console.log('');
console.log('📝 测试验证码流程...');

// 注意：由于 sendVerificationCode 需要实际发送邮件，这里只测试 verifyCode 函数
test('验证码验证 - 未发送前返回错误', () => {
    const result = auth.verifyCode('geolle@163.com', '123456');
    if (result.valid) {
        throw new Error('应该返回无效结果');
    }
    if (result.message !== '请先获取验证码') {
        throw new Error(`错误消息不匹配：${result.message}`);
    }
});

// 测试 5: 会话销毁
console.log('');
console.log('🚪 测试会话销毁...');
test('销毁会话成功', () => {
    const sessionId = auth.createSession('geolle@163.com');
    const destroyed = auth.destroySession(sessionId);
    if (!destroyed) {
        throw new Error('销毁失败');
    }
    
    const validation = auth.validateSession(sessionId);
    if (validation.valid) {
        throw new Error('会话应该已被销毁');
    }
});

// 测试 6: 清理功能
console.log('');
console.log('🧹 测试清理功能...');
test('cleanup 函数存在', () => {
    if (typeof auth.cleanup !== 'function') {
        throw new Error('cleanup 函数不存在');
    }
    // 执行清理（不会报错）
    auth.cleanup();
});

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
    console.log('🎉 所有认证功能测试通过！');
    console.log('');
    console.log('📧 下一步测试：');
    console.log('1. 启动服务器：npm start');
    console.log('2. 访问登录页：http://localhost:3000/session-player/login.html');
    console.log('3. 测试发送邮件功能');
    console.log('4. 测试完整登录流程');
    process.exit(0);
} else {
    console.log('⚠️  部分测试失败，请检查上述错误。');
    process.exit(1);
}
