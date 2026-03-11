# 🎬 OpenClaw Session Player - 会话回放技能

将会话历史转换为可播放的 Web 应用，支持分类管理、Markdown 渲染、脱敏录制、版本切换等功能。

**版本**: 3.0.0  
**最后更新**: 2026-03-11

---

## 📋 技能概述

**技能名称**: `session-player`

**功能描述**: 
- 将 OpenClaw 会话 JSONL 转录文件转换为 Web 可播放格式
- 创建完整的录制文件（包含思考过程、工具调用、API 响应）
- 提供美观的聊天式播放界面
- **同时生成原版和脱敏版**，支持安全分享
- 支持分类管理、标签系统、拖拽移动
- 支持 Markdown 渲染、倍速播放、全部加载
- 支持 HTTPS 访问（通过 Nginx 代理）

**适用场景**:
- 会话回顾与调试
- 对话流程分析
- 教学演示
- 问题排查
- **安全分享（脱敏版）**

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

### 2. 配置脱敏规则（可选但推荐）

```bash
# 复制脱敏规则示例
cp config/redact-rules.example.json config/redact-rules.json

# 编辑配置文件，自定义脱敏规则
vim config/redact-rules.json
```

> ⚠️ **安全提示**: `config/redact-rules.json` 已加入 `.gitignore`，不会被提交到 Git。

### 3. 安装依赖

```bash
cd /zed/workspace/skills/session-player
npm install
```

### 4. 转换会话

```bash
# 转换指定会话（同时生成原版和脱敏版）
node convert-jsonl.js <session-id>

# 示例
node convert-jsonl.js ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f
```

**输出示例**:
```
📖 读取 JSONL 文件：/root/.openclaw/agents/main/sessions/ec0e11eb.jsonl
📝 共 1243 行记录
✨ 转换完成：1243 条消息
💾 已保存到：recordings/uncategorized/ec0e11eb-full.json (原版)
📊 文件大小：1587757 bytes
💾 已保存到：recordings/uncategorized/ec0e11eb-redacted.json (脱敏版)
📊 文件大小：1523456 bytes

🔒 脱敏统计:
   - email: 5 处
   - api_key: 3 处
   - domain: 8 处

✅ 转换完成！
```

### 5. 批量脱敏历史文件（可选）

```bash
# 处理所有历史文件
node batch-redact.js --all

# 处理最近 7 天的文件
node batch-redact.js --days=7

# 处理指定文件
node batch-redact.js <session-id>
```

### 6. 启动服务器

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

### 7. 配置 Nginx（可选，用于 HTTPS）

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
├── SKILL.md                      # 技能文档（本文件）
├── README.md                     # 快速入门
├── convert-jsonl.js              # JSONL 转换器（双版本输出）
├── batch-redact.js               # 批量脱敏工具 ⭐ NEW
├── server.js                     # Express 服务器
├── index.html                    # 录制库首页（带分类树）
├── player.html                   # 会话播放器（支持版本切换）
├── preview.html                  # 脱敏预览 ⭐ NEW
├── settings.html                 # 规则设置 ⭐ NEW
├── package.json                  # 项目配置
├── recordings/                   # 录制文件存储目录 ⭐
│   ├── metadata.json            # 元数据（运行时创建，不提交）
│   ├── metadata.example.json    # 元数据示例（已提交）
│   ├── .gitkeep                 # 目录占位符
│   ├── uncategorized/           # 未分类目录
│   │   ├── *-full.json          # 原版（不提交）
│   │   └── *-redacted.json      # 脱敏版（不提交）
│   └── <category>/              # 用户自定义分类
│       ├── *-full.json          # 原版（不提交）
│       └── *-redacted.json      # 脱敏版（不提交）
├── config/
│   ├── config.example.json      # SMTP 配置示例
│   ├── config.json              # SMTP 配置（不提交）
│   ├── redact-rules.example.json # 脱敏规则示例
│   └── redact-rules.json        # 脱敏规则（不提交）
├── lib/
│   └── redactor.js              # 脱敏引擎 ⭐ NEW
├── auth.js                       # 邮箱验证码认证
├── login.html                    # 登录页面
└── .gitignore                    # Git 忽略规则
```

---

## 🎮 功能特性

### 录制库首页

| 功能 | 说明 |
|------|------|
| 📋 录制列表 | 卡片式展示，显示标题、分类、标签、备注 |
| 📁 分类树 | 左侧树形导航，显示每个分类的文件数量 |
| 🏷️ 标签筛选 | 按标签筛选录制文件 |
| ⭐ 星标筛选 | 只看星标会话 |
| 🔍 搜索 | 全文搜索（标题、备注、标签） |
| ➕ 新建分类 | 创建自定义分类目录 |
| 🖱️ 拖拽移动 | 拖动卡片到分类树修改分类 |
| 🔒 脱敏标识 | 显示脱敏版可用标识 |
| 🔗 分享 | 一键复制脱敏版分享链接 |
| 🔍 脱敏预览 | 并排对比原版和脱敏版 |
| ⚙️ 规则设置 | 管理脱敏规则 |

### 会话播放器

| 功能 | 说明 |
|------|------|
| ▶️ 播放/暂停 | 自动逐条展示消息 |
| 📄/🔒 版本切换 | 原版/脱敏版一键切换 |
| ⏩ 全部加载 | 一键展示整个会话 |
| ⏩ 倍速控制 | 0.5x / 1x / 2x / 5x |
| ⏭️ 跳过 | 快速前进 5 条消息 |
| 📊 进度条 | 实时显示播放进度 |
| ⌨️ 快捷键 | Space 播放/暂停，R 重置，L 全部加载 |
| 📝 Markdown | 助手回复支持 Markdown 渲染 |
| 🗂️ 折叠组 | 思考 + 工具调用自动折叠，3 倍速播放 |

### 分类管理系统

| 功能 | 说明 |
|------|------|
| 📁 文件夹分类 | 物理隔离，每个分类独立目录 |
| 🏷️ 标签系统 | 支持多标签，灵活标记 |
| 📝 自定义标题 | 为会话设置友好名称 |
| 📋 备注功能 | 添加会话备注信息 |
| ⭐ 星标功能 | 标记重要会话 |
| 🖱️ 拖拽移动 | 拖动卡片到分类树修改分类 |
| ✏️ 编辑对话框 | 统一编辑所有元数据 |

### 脱敏功能 ⭐ NEW

| 功能 | 说明 |
|------|------|
| 🔒 双版本输出 | 同时生成原版和脱敏版 |
| 📋 内置规则 | 8 种预设脱敏规则（邮箱、API 密钥、Token 等） |
| ✏️ 自定义规则 | 支持自定义正则表达式规则 |
| 📝 自定义替换 | 精确文本替换 |
| 🧪 规则测试 | 实时测试脱敏效果 |
| 📥 导入/导出 | 配置导入导出 |
| 📊 脱敏统计 | 显示脱敏数量和类型分布 |
| 🔍 脱敏预览 | 并排对比原版和脱敏版 |
| 🔗 安全分享 | 一键复制脱敏版链接 |
| ⚡ 批量脱敏 | 批量处理历史文件 |

---

## 🌐 访问方式

### 本地访问
```
http://localhost:3000/session-player/
```

### 互联网访问（配置 Nginx 后）
```
https://<your-domain>/session-player/
```

### 页面列表

| 页面 | 地址 | 说明 |
|------|------|------|
| 录制库首页 | `/session-player/` | 查看和管理录制文件 |
| 播放器 | `/session-player/player/<category>/<filename>` | 播放会话 |
| 脱敏预览 | `/session-player/preview` | 对比原版和脱敏版 |
| 规则设置 | `/session-player/settings` | 管理脱敏规则 |
| 登录 | `/session-player/login.html` | 邮箱验证码登录 |

---

## 📝 录制文件格式

### 源文件（JSONL）
OpenClaw 原始会话文件位于：
```
/root/.openclaw/agents/main/sessions/<session-id>.jsonl
```

### 转换后格式（JSON）
```json
{
  "recordingInfo": {
    "sessionId": "ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f",
    "sessionKey": "agent:main:main",
    "recordedAt": "2026-03-11T00:00:00.000Z",
    "channel": "webchat",
    "model": "qwen3.5-plus",
    "provider": "bailian",
    "title": "完整会话录制 - ec0e11eb",
    "description": "1:1 完整转录，包含所有思考过程和工具调用",
    "totalMessages": 1243,
    "sourceFile": "/root/.openclaw/agents/main/sessions/ec0e11eb.jsonl",
    "sourceFileSize": 1587757
  },
  "messages": [
    {
      "role": "user",
      "content": "汇总销售日报",
      "timestamp": "2026-03-11T00:00:00.000Z"
    },
    {
      "role": "assistant",
      "type": "thinking",
      "content": "用户想要汇总销售日报...",
      "timestamp": "2026-03-11T00:00:00.001Z"
    },
    {
      "role": "assistant",
      "type": "toolCall",
      "toolName": "sessions_list",
      "content": "🔧 调用工具：**sessions_list**",
      "timestamp": "2026-03-11T00:00:00.001Z"
    }
  ]
}
```

### 元数据格式（metadata.json）
```json
{
  "ec0e11eb-full.json": {
    "originalFilename": "ec0e11eb-full.json",
    "customTitle": "销售日报汇总",
    "category": "work",
    "tags": ["销售", "日报", "重要"],
    "note": "每日销售数据汇总，需要定期查看",
    "starred": true,
    "redactedVersion": "ec0e11eb-redacted.json",
    "createdAt": "2026-03-11T00:00:00.000Z",
    "updatedAt": "2026-03-11T12:00:00.000Z"
  }
}
```

---

## 🔧 脱敏规则配置

### 内置规则

| 规则名称 | 匹配内容 | 替换为 |
|---------|---------|--------|
| email | 邮箱地址 | `[REDACTED_EMAIL]` |
| api_key | 阿里云 API 密钥 | `[REDACTED_API_KEY]` |
| npm_token | NPM 访问令牌 | `[REDACTED_NPM_TOKEN]` |
| github_token | GitHub Token | `[REDACTED_GITHUB_TOKEN]` |
| password | 密码 | `[REDACTED_PASSWORD]` |
| ip_address | IP 地址 | `[REDACTED_IP]` |
| domain | 域名 | `[REDACTED_DOMAIN]` |
| smtp_key | SMTP/IMAP 密钥 | `[REDACTED_SMTP_KEY]` |

### 配置示例（config/redact-rules.json）

```json
{
  "enabled": true,
  "rules": [
    {
      "name": "email",
      "description": "邮箱地址",
      "pattern": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
      "replacement": "[REDACTED_EMAIL]"
    },
    {
      "name": "api_key",
      "description": "阿里云 API 密钥",
      "pattern": "sk-[a-zA-Z0-9]{32,}",
      "replacement": "[REDACTED_API_KEY]"
    }
  ],
  "customReplacements": {
    "Geoffrey Lee": "[REDACTED_NAME]",
    "zedbot": "[REDACTED_SERVER]"
  }
}
```

---

## 🔧 API 端点

### 录制文件 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/recordings` | GET | 获取录制列表（支持分类/标签筛选） |
| `/api/recordings/:filename` | GET | 获取单个录制文件内容 |
| `/api/recordings/:filename/metadata` | PUT | 更新元数据（标题/分类/标签/备注/星标） |
| `/api/recordings/:filename/move` | PUT | 移动文件到另一个分类 |
| `/api/recordings/rename` | PUT | 重命名录制文件 |

### 分类管理 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/categories` | GET | 获取所有分类 |
| `/api/categories` | POST | 创建新分类 |

### 标签管理 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/tags` | GET | 获取所有标签 |

### 脱敏规则 API ⭐ NEW

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/config/redact-rules` | GET | 获取脱敏规则配置 |
| `/api/config/redact-rules` | PUT | 保存脱敏规则配置 |
| `/api/redact/test` | POST | 测试脱敏效果 |

### 认证 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/auth/send-code` | POST | 发送验证码 |
| `/api/auth/verify` | POST | 验证登录 |
| `/api/auth/check` | GET | 检查会话状态 |
| `/api/auth/logout` | POST | 登出 |

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Node.js + Express |
| **前端** | 原生 HTML/CSS/JavaScript |
| **认证** | 邮箱验证码（SMTP） |
| **Markdown** | marked.js（CDN） |
| **脱敏** | 自定义脱敏引擎 |
| **样式** | 渐变背景、卡片布局、动画效果 |
| **代理** | Nginx (HTTPS/HTTP2) |

---

## 📋 消息类型与渲染

| 类型 | 角色 | 渲染方式 | 样式 |
|------|------|---------|------|
| `user` | 用户 | 纯文本（转义） | 右侧蓝色气泡 |
| `assistant/thinking` | 助手思考 | 纯文本（转义） | 居中灰色半透明 |
| `assistant/toolCall` | 工具调用 | Markdown 渲染 | 左侧黄色调，带工具标签 |
| `assistant/text` | 普通回复 | **Markdown 渲染** | 左侧默认背景 |
| `tool` | 工具结果 | Markdown 渲染 | 左侧黄色调，较小气泡 |

---

## 🎯 使用示例

### 获取当前会话 ID

```bash
# 查看最近的会话文件
ls -lt /root/.openclaw/agents/main/sessions/*.jsonl | head -5
```

### 转换并播放

```bash
# 1. 转换会话（生成原版 + 脱敏版）
node convert-jsonl.js ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f

# 2. 启动服务器
npm start

# 3. 访问播放器
# http://localhost:3000/session-player/player/uncategorized/ec0e11eb-full.json

# 4. 在播放器中选择"🔒 脱敏版"
```

### 批量转换

```bash
# 转换所有最近的会话
for file in /root/.openclaw/agents/main/sessions/*.jsonl; do
    session_id=$(basename "$file" .jsonl)
    node convert-jsonl.js "$session_id"
done
```

### 批量脱敏历史文件

```bash
# 处理所有文件
node batch-redact.js --all

# 处理最近 7 天
node batch-redact.js --days=7

# 处理指定文件
node batch-redact.js ec0e11eb
```

### 分享脱敏版

1. 在录制库首页找到有 🔒 标识的卡片
2. 点击"🔗 分享"按钮
3. 链接自动复制到剪贴板
4. 发送给他人

分享链接格式：
```
https://<your-domain>/session-player/player/uncategorized/ec0e11eb-redacted.json?version=redacted
```

---

## ⚙️ 配置选项

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务器监听端口 |
| `RECORDINGS_DIR` | `./recordings` | 录制文件存储目录 |

### SMTP 配置（config/config.json）

```json
{
  "email": {
    "smtp": {
      "host": "smtp.163.com",
      "port": 465,
      "secure": true,
      "auth": {
        "user": "your-email@163.com",
        "pass": "your-smtp-password"
      }
    },
    "allowedEmail": "your-email@163.com",
    "from": "your-email@163.com"
  },
  "session": {
    "expiryDays": 7
  },
  "verificationCode": {
    "expiryMinutes": 5
  }
}
```

> ⚠️ **安全提示**: 真实配置文件已在 `.gitignore` 中，不会被提交。

### 脱敏规则配置（config/redact-rules.json）

```json
{
  "enabled": true,
  "rules": [
    {
      "name": "email",
      "description": "邮箱地址",
      "pattern": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
      "replacement": "[REDACTED_EMAIL]"
    }
  ],
  "customReplacements": {
    "Your Name": "[REDACTED_NAME]",
    "your-server": "[REDACTED_SERVER]"
  }
}
```

> ⚠️ **安全提示**: 真实规则配置已在 `.gitignore` 中，不会被提交。

---

## 🔍 故障排查

### 问题 1：播放器显示"文件不存在"

**原因**: 文件位置与元数据记录不一致

**解决**: 
```bash
# 智能查找会自动扫描所有分类目录
# 如果还是找不到，检查文件实际位置
ls -la recordings/uncategorized/
ls -la recordings/<category>/
```

### 问题 2：拖拽移动失败

**原因**: 服务器未重启或路由未更新

**解决**:
```bash
# 重启服务器
pkill -f "node server.js"
npm start
```

### 问题 3：Markdown 没有渲染

**原因**: marked.js 未加载

**解决**:
- 检查网络连接（CDN 依赖）
- 刷新页面
- 检查浏览器控制台错误

### 问题 4：Nginx 代理返回 404

**原因**: location 配置缺少末尾斜杠

**解决**: 确保 `proxy_pass` URL 末尾有 `/`

```nginx
location /session-player/ {
    proxy_pass http://127.0.0.1:3000/;  # 注意末尾的 /
}
```

### 问题 5：端口被占用

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

### 问题 6：脱敏规则设置提示"配置文件不存在"

**原因**: 未复制配置文件

**解决**:
```bash
cp config/redact-rules.example.json config/redact-rules.json
vim config/redact-rules.json  # 编辑配置
```

### 问题 7：批量脱敏工具报错

**原因**: 脱敏规则未配置

**解决**:
```bash
# 先配置脱敏规则
cp config/redact-rules.example.json config/redact-rules.json
vim config/redact-rules.json

# 再运行批量脱敏
node batch-redact.js --all
```

---

## 📝 注意事项

1. **JSONL 文件位置**: 默认在 `/root/.openclaw/agents/main/sessions/`
2. **权限**: 需要读取 JSONL 文件的权限
3. **文件大小**: 完整会话可能很大（500KB+）
4. **浏览器兼容**: 需要支持 ES6 的现代浏览器
5. **录制文件**: 包含完整会话历史，可能包含敏感信息，**不要提交到 Git**
6. **元数据文件**: `metadata.json` 运行时自动创建，不提交；提交 `metadata.example.json` 作为模板
7. **Markdown 渲染**: 仅对助手回复和工具消息启用，用户消息保持纯文本（安全）
8. **脱敏文件**: 原版和脱敏版都不提交到 Git
9. **配置文件**: `config.json` 和 `redact-rules.json` 不提交到 Git

---

## 🔒 安全建议

| 建议 | 说明 |
|------|------|
| **录制文件** | 已在 `.gitignore` 中，不要提交 |
| **配置文件** | 已在 `.gitignore` 中，不要提交 |
| **脱敏规则** | 已在 `.gitignore` 中，不要提交 |
| **域名脱敏** | 文档中使用 `<your-domain>` 占位符 |
| **API 密钥** | 不要硬编码在代码中 |
| **SMTP 凭据** | 通过配置文件管理 |
| **分享链接** | 仅分享脱敏版链接，不分享原版 |

---

## 🚀 扩展建议

- [x] 添加搜索功能
- [x] 支持导出为 PDF/Markdown
- [x] 添加消息高亮/标记
- [ ] 支持多会话对比
- [x] 添加时间轴跳转
- [ ] 支持语音播放（TTS）
- [x] 脱敏录制功能
- [x] 版本切换功能
- [x] 分享功能
- [x] 批量脱敏工具
- [x] 脱敏预览功能
- [x] 自定义规则 UI

---

## 📄 License

MIT License

---

## 📝 更新日志

### v3.0.0 (2026-03-11) - 完整版
- ✅ **Phase 1**: 脱敏引擎和双版本输出
- ✅ **Phase 2**: 录制卡片标识、播放器版本切换、分享功能
- ✅ **Phase 3**: 批量脱敏工具、脱敏预览功能、自定义规则 UI
- ✅ 新增 `lib/redactor.js` 脱敏引擎
- ✅ 新增 `batch-redact.js` 批量脱敏工具
- ✅ 新增 `preview.html` 脱敏预览页面
- ✅ 新增 `settings.html` 规则设置页面
- ✅ 新增脱敏规则管理 API
- ✅ 更新 `.gitignore` 保护敏感文件
- ✅ 全面文档更新

### v2.0.0 (2026-03-11) - 分类管理版
- ✅ 分类管理系统
- ✅ Markdown 渲染支持
- ✅ 拖拽修改分类
- ✅ 左侧分类树导航

### v1.0.1 (2026-03-04)
- 添加工作空间规范说明，明确录制文件存储位置

### v1.0.0 (2026-03-04)
- 初始版本发布

---

**作者**: Zed  
**版本**: 3.0.0  
**最后更新**: 2026-03-11  
**GitHub**: https://github.com/zzedbot/skill-session-player
