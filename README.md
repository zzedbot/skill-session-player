# 🎬 OpenClaw Session Player

> 将会话历史转换为可播放的 Web 应用

---

## ⚡ 快速开始

### 1. 配置 SMTP（邮件验证码登录必需）

```bash
cp config/config.example.json config/config.json
vim config/config.json  # 编辑 SMTP 凭据
```

> ⚠️ **安全**: `config/config.json` 已加入 `.gitignore`，不会被提交。

### 2. 安装
```bash
npm install
```

### 3. 转换会话
```bash
node convert-jsonl.js <session-id>
```

### 4. 启动
```bash
npm start
```

### 5. 访问
- **本地**: http://localhost:3000/
- **互联网**: `https://<your-domain>/session-player/`

---

## 📁 文件存储

**录制文件位置**: `skills/session-player/recordings/`

> ⚠️ 根据工作空间规范，录制文件必须存放在技能目录内，不使用符号链接。

---

## 🎮 功能

| 功能 | 说明 |
|------|------|
| ▶️ 播放/暂停 | 自动逐条展示消息 |
| ⏩ 倍速控制 | 0.5x / 1x / 2x / 5x |
| ⏭️ 跳过 | 快速前进 5 条消息 |
| 📊 进度条 | 实时显示播放进度 |
| ⌨️ 快捷键 | Space 播放/暂停，R 重置 |

---

## 📋 录制文件格式

```json
{
  "recordingInfo": {
    "sessionId": "1489ec21-0b89-4cf4-8d01-223ea2f93c76",
    "totalMessages": 1243,
    "model": "qwen3.5-plus"
  },
  "messages": [...]
}
```

---

## 🔧 Nginx 配置

```nginx
location /session-player/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}
```

---

## 📖 详细文档

查看 [`SKILL.md`](./SKILL.md) 获取完整文档

---

## 🚀 GitHub

代码已推送到：https://github.com/zzedbot/zedbotskills

---

*最后更新：2026-03-04*
