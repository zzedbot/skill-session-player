# 🎬 OpenClaw Session Player

> 将会话历史转换为可播放的 Web 应用，支持分类管理、Markdown 渲染、倍速播放

---

## ⚡ 快速开始

### 1. 配置 SMTP（邮件验证码登录必需）

```bash
cp config/config.example.json config/config.json
vim config/config.json  # 编辑 SMTP 凭据
```

> ⚠️ **安全**: `config/config.json` 已加入 `.gitignore`，不会被提交。

### 2. 安装依赖
```bash
npm install
```

### 3. 转换会话
```bash
node convert-jsonl.js <session-id>
```

### 4. 启动服务器
```bash
npm start
```

### 5. 访问
- **本地**: http://localhost:3000/
- **互联网**: https://<your-domain>/session-player/

---

## 🎯 核心功能

### 录制库首页
- 📁 **左侧分类树** - 树形导航，显示文件数量
- 🏷️ **标签筛选** - 按标签快速筛选
- ⭐ **星标筛选** - 只看重要会话
- 🔍 **全文搜索** - 搜索标题、备注、标签
- 🖱️ **拖拽移动** - 拖动卡片修改分类
- ➕ **新建分类** - 创建自定义分类目录

### 会话播放器
- ▶️ **播放控制** - 播放/暂停/重置/跳过
- ⏩ **全部加载** - 一键展示整个会话（快捷键 L）
- ⏩ **倍速播放** - 0.5x / 1x / 2x / 5x
- 📝 **Markdown** - 助手回复自动渲染 Markdown
- 🗂️ **智能折叠** - 思考 + 工具调用自动折叠（3 倍速）
- ⌨️ **快捷键** - Space 播放，R 重置，L 全部加载

### 分类管理
- 📁 **文件夹分类** - 物理隔离，独立目录
- 🏷️ **多标签系统** - 灵活标记会话
- 📝 **自定义标题** - 设置友好名称
- 📋 **备注功能** - 添加会话备注
- ⭐ **星标功能** - 标记重要会话

---

## 📁 文件存储

**录制文件位置**: `recordings/` 目录

```
recordings/
├── metadata.json              # 元数据（运行时创建）
├── metadata.example.json      # 元数据示例（已提交）
├── uncategorized/             # 未分类
│   └── *.json
└── <category>/                # 自定义分类
    └── *.json
```

> ⚠️ 根据工作空间规范，录制文件必须存放在技能目录内，不使用符号链接。

---

## 📋 录制文件格式

```json
{
  "recordingInfo": {
    "sessionId": "ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f",
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

查看 [`SKILL.md`](./SKILL.md) 获取完整文档，包括：
- 完整功能说明
- API 端点文档
- 故障排查指南
- 安全建议

---

## 🚀 GitHub

代码已推送到：https://github.com/zzedbot/skill-session-player

---

*最后更新：2026-03-11 | 版本：2.0.0*
