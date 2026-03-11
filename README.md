# 🎬 OpenClaw Session Player

> 将会话历史转换为可播放的 Web 应用，支持脱敏录制、版本切换、安全分享

**版本**: 3.0.0  
**最后更新**: 2026-03-11

---

## ⚡ 快速开始

### 1. 配置

```bash
# SMTP 配置（登录必需）
cp config/config.example.json config/config.json
vim config/config.json

# 脱敏规则配置（推荐）
cp config/redact-rules.example.json config/redact-rules.json
vim config/redact-rules.json
```

> ⚠️ **安全**: 配置文件已加入 `.gitignore`，不会被提交。

### 2. 安装依赖
```bash
npm install
```

### 3. 转换会话
```bash
# 同时生成原版和脱敏版
node convert-jsonl.js <session-id>
```

### 4. 启动服务器
```bash
npm start
```

### 5. 访问
- **本地**: http://localhost:3000/session-player/
- **互联网**: https://<your-domain>/session-player/

---

## 🎯 核心功能

### 录制库
| 功能 | 说明 |
|------|------|
| 📁 **分类管理** | 左侧树形导航，拖拽移动 |
| 🏷️ **标签筛选** | 按标签快速筛选 |
| ⭐ **星标筛选** | 只看重要会话 |
| 🔍 **全文搜索** | 搜索标题、备注、标签 |
| 🔒 **脱敏标识** | 显示脱敏版可用 |
| 🔗 **一键分享** | 复制脱敏版链接 |

### 播放器
| 功能 | 说明 |
|------|------|
| 📄/🔒 **版本切换** | 原版/脱敏版一键切换 |
| ▶️ **播放控制** | 播放/暂停/重置/跳过 |
| ⏩ **全部加载** | 一键展示整个会话 |
| ⏩ **倍速播放** | 0.5x / 1x / 2x / 5x |
| 📝 **Markdown** | 自动渲染 Markdown |
| 🗂️ **智能折叠** | 思考 + 工具 3 倍速播放 |

### 脱敏功能 ⭐ NEW
| 功能 | 说明 |
|------|------|
| 🔒 **双版本输出** | 同时生成原版和脱敏版 |
| 📋 **内置规则** | 8 种预设脱敏规则 |
| ✏️ **自定义规则** | 支持正则表达式 |
| 🧪 **规则测试** | 实时测试脱敏效果 |
| 🔍 **脱敏预览** | 并排对比原版/脱敏版 |
| ⚡ **批量脱敏** | 批量处理历史文件 |
| ⚙️ **规则管理** | Web UI 管理规则 |

---

## 📁 文件存储

**录制文件位置**: `recordings/` 目录

```
recordings/
├── metadata.json              # 元数据（运行时创建）
├── metadata.example.json      # 元数据示例（已提交）
├── uncategorized/             # 未分类
│   ├── *-full.json           # 原版（不提交）
│   └── *-redacted.json       # 脱敏版（不提交）
└── <category>/                # 自定义分类
    ├── *-full.json           # 原版（不提交）
    └── *-redacted.json       # 脱敏版（不提交）
```

> ⚠️ **重要**: 所有录制文件（原版和脱敏版）都不提交到 Git。

---

## 🔒 脱敏规则

### 内置规则

| 类型 | 替换为 |
|------|--------|
| 📧 邮箱地址 | `[REDACTED_EMAIL]` |
| 🔑 API 密钥 | `[REDACTED_API_KEY]` |
| 📦 NPM Token | `[REDACTED_NPM_TOKEN]` |
| 🐙 GitHub Token | `[REDACTED_GITHUB_TOKEN]` |
| 🔐 密码 | `[REDACTED_PASSWORD]` |
| 🌐 IP 地址 | `[REDACTED_IP]` |
| 🌍 域名 | `[REDACTED_DOMAIN]` |
| 📮 SMTP 密钥 | `[REDACTED_SMTP_KEY]` |

### 自定义规则

访问 `/session-player/settings` 管理自定义规则。

---

## 🚀 使用示例

### 转换会话
```bash
node convert-jsonl.js ec0e11eb
```

**输出**:
```
💾 已保存到：recordings/uncategorized/ec0e11eb-full.json (原版)
💾 已保存到：recordings/uncategorized/ec0e11eb-redacted.json (脱敏版)
🔒 脱敏统计:
   - email: 5 处
   - api_key: 3 处
   - domain: 8 处
```

### 批量脱敏
```bash
# 处理所有历史文件
node batch-redact.js --all

# 处理最近 7 天
node batch-redact.js --days=7
```

### 分享脱敏版
1. 找到有 🔒 标识的卡片
2. 点击"🔗 分享"
3. 链接自动复制

**分享链接**:
```
https://<your-domain>/session-player/player/uncategorized/ec0e11eb-redacted.json?version=redacted
```

### 脱敏预览
访问 `/session-player/preview` 并排对比原版和脱敏版。

### 规则设置
访问 `/session-player/settings` 管理脱敏规则。

---

## 📖 详细文档

查看 [`SKILL.md`](./SKILL.md) 获取完整文档，包括：
- 完整功能说明
- API 端点文档
- 配置选项
- 故障排查指南
- 安全建议

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

## 🚀 GitHub

代码已推送到：https://github.com/zzedbot/skill-session-player

---

## 📝 更新日志

### v3.0.0 (2026-03-11)
- ✅ 脱敏录制功能（双版本输出）
- ✅ 播放器版本切换
- ✅ 分享功能
- ✅ 脱敏预览功能
- ✅ 批量脱敏工具
- ✅ 自定义规则 UI

### v2.0.0 (2026-03-11)
- ✅ 分类管理系统
- ✅ Markdown 渲染

### v1.0.0 (2026-03-04)
- ✅ 初始版本

---

*最后更新：2026-03-11 | 版本：3.0.0*
