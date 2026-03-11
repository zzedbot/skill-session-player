# 🚀 推送到 GitHub 指南

## 当前状态

✅ **本地 Git 仓库已初始化**
- 位置：`/zed/workspace/skills/session-player/.git`
- 分支：main
- 提交：Initial release (91526f0)
- 文件：11 个文件，1785 行代码

## 推送步骤

### 方法 1: 手动推送（推荐）

```bash
# 1. 进入技能目录
cd /zed/workspace/skills/session-player

# 2. 添加远程仓库（需要先创建仓库）
git remote add origin git@github.com:zzedbot/openclaw-skills.git

# 3. 使用 SSH key 推送
GIT_SSH_COMMAND="ssh -i /zed/workspace/ssh_keys/github_zzedbot_rsa -o StrictHostKeyChecking=no" git push -u origin main
```

### 方法 2: 使用 GitHub CLI

```bash
# 安装 gh (如果未安装)
sudo apt install gh  # Ubuntu/Debian
brew install gh      # macOS

# 认证
gh auth login

# 创建仓库并推送
cd /zed/workspace/skills/session-player
gh repo create openclaw-skills --public --source=. --remote=origin --push
```

### 方法 3: 使用 HTTPS

```bash
# 添加远程仓库
git remote add origin https://github.com/zzedbot/openclaw-skills.git

# 推送（需要输入 GitHub token）
git push -u origin main
```

## 创建 GitHub 仓库

### 在 GitHub 网站上：

1. 访问 https://github.com/new
2. 仓库名：`openclaw-skills`
3. 描述：`OpenClaw Skills Collection - Session Player and more`
4. 选择 **Public**
5. **不要** 初始化 README、.gitignore 或 license
6. 点击 "Create repository"

### 创建后推送现有代码：

```bash
cd /zed/workspace/skills/session-player
git remote add origin git@github.com:zzedbot/openclaw-skills.git
GIT_SSH_COMMAND="ssh -i /zed/workspace/ssh_keys/github_zzedbot_rsa" git push -u origin main
```

## 使用 SSH Key

本工作空间已配置 SSH key：
- **私钥**: `/zed/workspace/ssh_keys/github_zzedbot_rsa`
- **公钥**: `/zed/workspace/ssh_keys/github_zzedbot_rsa.pub`
- **关联账户**: zzedbot

### 测试 SSH 连接：

```bash
ssh -i /zed/workspace/ssh_keys/github_zzedbot_rsa -T git@github.com
```

预期输出：
```
Hi zzedbot! You've successfully authenticated, but GitHub does not provide shell access.
```

## 仓库结构建议

推荐将 skills 作为 monorepo 管理：

```
openclaw-skills/
├── README.md              # 总览文档
├── skills/
│   ├── session-player/    # 会话回放技能
│   ├── weather/           # 天气技能
│   ├── healthcheck/       # 健康检查技能
│   └── ...
└── templates/             # 技能模板
```

## 发布到 NPM（可选）

```bash
# 登录 NPM
npm login

# 发布
cd /zed/workspace/skills/session-player
npm publish --access public
```

包名：`@zzedbot/openclaw-session-player`

## 后续更新

```bash
# 修改代码后
cd /zed/workspace/skills/session-player
git add .
git commit -m "feat: 更新说明"
git push
```

## 问题排查

### 权限错误

确保 SSH key 权限正确：
```bash
chmod 600 /zed/workspace/ssh_keys/github_zzedbot_rsa
```

### 仓库不存在

确保已在 GitHub 创建仓库，或检查仓库名是否正确。

### 远程仓库已存在

```bash
git remote remove origin
git remote add origin <新地址>
```

---

📄 **相关文件**:
- [SKILL.md](./SKILL.md) - 完整技能文档
- [README.md](./README.md) - 快速入门
- [EXAMPLES.md](./EXAMPLES.md) - 使用示例
