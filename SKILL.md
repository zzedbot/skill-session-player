# 🎬 OpenClaw Session Player - 会话回放技能

将会话历史转换为可播放的 Web 应用，支持 1:1 完整回放、聊天式界面、倍速播放等功能。

---

## 📋 技能概述

**技能名称**: `session-player`

**功能描述**: 
- 将 OpenClaw 会话 JSONL 转录文件转换为 Web 可播放格式
- 创建完整的录制文件（包含思考过程、工具调用、API 响应）
- 提供美观的聊天式播放界面
- 支持 HTTPS 访问（通过 Nginx 代理）

**适用场景**:
- 会话回顾与调试
- 对话流程分析
- 教学演示
- 问题排查

---

## 🚀 快速开始

### 1. 配置 SMTP（邮件验证码登录必需）

```bash
# 复制配置模板
cp config/config.example.json config/config.json

# 编辑配置文件，填入你的 SMTP 凭据
vim config/config.json
```

> ⚠️ **安全提示**: `config/config.json` 已加入 `.gitignore`，不会被提交到 Git。

### 2. 安装依赖

```bash
cd /zed/workspace/skills/session-player
npm install
```

### 3. 转换会话

```bash
# 转换当前会话
node convert-jsonl.js <session-id>

# 示例：转换指定会话
node convert-jsonl.js 1489ec21-0b89-4cf4-8d01-223ea2f93c76
```

### 3. 启动服务器

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

### 4. 配置 Nginx（可选，用于 HTTPS）

编辑 Nginx 配置文件 `/etc/nginx/sites-available/<your-domain>`：

```nginx
location /session-player/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;
}
```

然后重载 Nginx：

```bash
/usr/sbin/nginx -t && systemctl reload nginx
```

---

## 📁 文件结构

```
session-player/
├── SKILL.md               # 技能文档（本文件）
├── convert-jsonl.js       # JSONL 转换器
├── server.js              # Express 服务器
├── index.html             # 录制库首页
├── player.html            # 会话播放器
├── package.json           # 项目配置
├── recordings/            # 录制文件存储目录 ⭐
│   └── *.json             # 录制的会话文件
└── README.md              # 使用说明
```

> ⚠️ **重要**: 录制文件必须存放在 `skills/session-player/recordings/` 目录内，符合工作空间规范。

---

## 🎮 功能特性

### 录制库首页
- 📋 查看所有录制文件列表
- 📊 显示元数据（时间、模型、消息数）
- 🎯 点击卡片进入播放器

### 会话播放器
- ▶️ **播放/暂停** - 自动逐条展示消息
- ⏩ **倍速控制** - 0.5x / 1x / 2x / 5x
- ⏭️ **跳过** - 快速前进 5 条消息
- ⏮️ **重置** - 从头开始
- 📊 **进度条** - 实时显示播放进度
- ⌨️ **键盘快捷键**:
  - `Space` - 播放/暂停
  - `R` - 重置
  - `→` - 跳过

### 聊天式界面
- 👤 **用户消息** - 右侧蓝色气泡
- 🤖 **助手回复** - 左侧默认气泡
- 🔧 **工具调用** - 左侧黄色气泡（带工具标签）
- 💭 **思考内容** - 居中半透明气泡（虚线边框）

---

## 🌐 访问方式

### 本地访问
```
http://localhost:3000/
```

### 互联网访问（配置 Nginx 后）
```
https://<your-domain>/session-player/
```

---

## 📝 录制文件格式

```json
{
  "recordingInfo": {
    "sessionId": "1489ec21-0b89-4cf4-8d01-223ea2f93c76",
    "sessionKey": "agent:main:main",
    "recordedAt": "2026-03-04T03:53:21.388Z",
    "channel": "webchat",
    "model": "qwen3.5-plus",
    "provider": "bailian",
    "title": "完整会话录制 - 1489ec21",
    "description": "1:1 完整转录，包含所有思考过程和工具调用",
    "totalMessages": 1243,
    "sourceFile": "/root/.openclaw/agents/main/sessions/1489ec21-0b89-4cf4-8d01-223ea2f93c76.jsonl",
    "sourceFileSize": 1587757
  },
  "messages": [
    {
      "role": "user",
      "content": "汇总销售日报",
      "timestamp": "2026-03-04T03:53:21.388Z"
    },
    {
      "role": "assistant",
      "type": "thinking",
      "content": "用户想要汇总销售日报...",
      "timestamp": "2026-03-04T03:53:21.390Z"
    },
    {
      "role": "assistant",
      "type": "toolCall",
      "toolName": "sessions_list",
      "content": "🔧 调用工具：**sessions_list**",
      "timestamp": "2026-03-04T03:53:21.390Z"
    }
  ]
}
```

---

## 🔧 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/recordings` | GET | 获取所有录制文件列表 |
| `/api/recordings/:filename` | GET | 获取单个录制文件内容 |
| `/` | GET | 录制库首页 |
| `/player/:filename` | GET | 会话播放器页面 |

---

## 🛠️ 技术栈

- **后端**: Node.js + Express
- **前端**: 原生 HTML/CSS/JavaScript
- **样式**: 渐变背景、卡片布局、动画效果
- **播放**: 定时消息展示、进度跟踪
- **代理**: Nginx (HTTPS/HTTP2)

---

## 📋 消息类型

| 类型 | 角色 | 位置 | 样式 |
|------|------|------|------|
| `user` | 用户 | 右侧 | 蓝色渐变气泡 |
| `assistant/thinking` | 助手思考 | 左侧 | 灰色半透明 |
| `assistant/toolCall` | 工具调用 | 左侧 | 黄色调，带工具标签 |
| `assistant/text` | 普通回复 | 左侧 | 默认背景 |
| `tool` | 工具结果 | 左侧 | 黄色调，较小气泡 |

---

## 🎯 使用示例

### 获取当前会话 ID

```bash
# 查看最近的会话文件
ls -lt /root/.openclaw/agents/main/sessions/*.jsonl | head -5
```

### 转换并播放

```bash
# 1. 转换会话
node convert-jsonl.js 1489ec21-0b89-4cf4-8d01-223ea2f93c76

# 2. 启动服务器
npm start

# 3. 访问播放器
# http://localhost:3000/player/1489ec21-0b89-4cf4-8d01-223ea2f93c76-full.json
```

### 批量转换

```bash
# 转换所有最近的会话
for file in /root/.openclaw/agents/main/sessions/*.jsonl; do
    session_id=$(basename "$file" .jsonl)
    node convert-jsonl.js "$session_id"
done
```

---

## ⚙️ 配置选项

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务器监听端口 |
| `RECORDINGS_DIR` | `./recordings` | 录制文件存储目录 |

### 转换选项

在 `convert-jsonl.js` 中可配置：

- 消息内容截断长度（默认 500 字符）
- 时间戳格式
- 元数据清理规则

---

## 📍 工作空间规范

根据 `WORKSPACE_GUIDE.md` 要求：

| 规则 | 说明 |
|------|------|
| **录制文件位置** | 必须存放在 `skills/session-player/recordings/` |
| **禁止符号链接** | 不使用符号链接指向其他目录 |
| **数据隔离** | 每个技能的数据存放在各自目录内 |
| **敏感信息** | 录制文件可能包含敏感信息，不要提交到 Git |

---

## 🔍 故障排查

### 问题 1：播放器显示"暂无录制文件"

**原因**: 录制文件未存放在正确目录

**解决**: 
```bash
# 确认文件位置
ls -la /zed/workspace/skills/session-player/recordings/

# 如果文件在其他位置，移动到正确位置
mv /path/to/recording.json /zed/workspace/skills/session-player/recordings/
```

### 问题 2：播放器显示"加载失败"

**原因**: API 路径配置错误

**解决**: 检查 `player.html` 中的 API 请求路径是否正确

### 问题 3：Nginx 代理返回 404

**原因**: location 配置缺少末尾斜杠

**解决**: 确保 `proxy_pass` URL 末尾有 `/`

```nginx
location /session-player/ {
    proxy_pass http://127.0.0.1:3000/;  # 注意末尾的 /
}
```

### 问题 4：端口被占用

**症状**: `Error: listen EADDRINUSE`

**解决**:
```bash
# 查找占用端口的进程
netstat -tlnp | grep 3000

# 杀掉进程
kill <PID>

# 重启服务器
npm start
```

---

## 📝 注意事项

1. **JSONL 文件位置**: 默认在 `/root/.openclaw/agents/main/sessions/`
2. **权限**: 需要读取 JSONL 文件的权限
3. **文件大小**: 完整会话可能很大（500KB+）
4. **浏览器兼容**: 需要支持 ES6 的现代浏览器
5. **录制文件**: 包含完整会话历史，可能包含敏感信息

---

## 🚀 扩展建议

- [ ] 添加搜索功能
- [ ] 支持导出为 PDF/Markdown
- [ ] 添加消息高亮/标记
- [ ] 支持多会话对比
- [ ] 添加时间轴跳转
- [ ] 支持语音播放（TTS）

---

## 📄 License

MIT License

---

**作者**: Zed  
**版本**: 1.0.1  
**最后更新**: 2026-03-04

**更新日志**:
- v1.0.1: 添加工作空间规范说明，明确录制文件存储位置
- v1.0.0: 初始版本发布
