# 📖 使用示例

## 快速上手

### 1. 安装

```bash
cd /zed/workspace/skills/session-player
./install.sh
```

### 2. 获取会话 ID

```bash
# 查看最近的会话文件
ls -lt /root/.openclaw/agents/main/sessions/*.jsonl | head -5

# 示例输出：
# -rw-r--r-- 1 root root 716K Mar  4 10:33 ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f.jsonl
# -rw-r--r-- 1 root root 450K Mar  4 09:20 4ab6468c-67dc-41fd-9a26-adc820f4a36c.jsonl
```

### 3. 转换会话

```bash
# 转换指定会话
node convert-jsonl.js ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f

# 输出：
# 📖 读取 JSONL 文件：/root/.openclaw/agents/main/sessions/ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f.jsonl
# 📝 共 178 行记录
# ✨ 转换完成：279 条消息
# 💾 已保存到：/zed/workspace/skills/session-player/recordings/ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f-full.json
```

### 4. 启动服务器

```bash
npm start

# 输出：
# ╔═══════════════════════════════════════════════════════════╗
# ║       🎬 OpenClaw 会话回放服务器已启动                    ║
# ╚═══════════════════════════════════════════════════════════╝
#
# 📡 服务器地址：http://localhost:3000
# 📁 录制目录：/zed/workspace/skills/session-player/recordings
```

### 5. 访问播放器

打开浏览器访问：
- **录制库首页**: http://localhost:3000/
- **直接播放**: http://localhost:3000/player/ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f-full.json

## 高级用法

### 批量转换多个会话

```bash
#!/bin/bash
# 转换最近 5 个会话
for file in $(ls -t /root/.openclaw/agents/main/sessions/*.jsonl | head -5); do
    session_id=$(basename "$file" .jsonl)
    echo "转换：$session_id"
    node convert-jsonl.js "$session_id"
done
```

### 自定义端口

```bash
PORT=8080 npm start
```

### 后台运行

```bash
# 使用 nohup
nohup npm start > session-player.log 2>&1 &

# 使用 pm2（如果已安装）
pm2 start server.js --name session-player
```

### 配置 Nginx HTTPS

1. 编辑 Nginx 配置：

```bash
sudo nano /etc/nginx/sites-available/<your-domain>
```

2. 添加 location 配置：

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

3. 测试并重载：

```bash
sudo /usr/sbin/nginx -t && sudo systemctl reload nginx
```

4. 访问：https://<your-domain>/session-player/

## 播放器操作

### 键盘快捷键

| 按键 | 功能 |
|------|------|
| `Space` | 播放/暂停 |
| `R` | 重置回放 |
| `→` | 跳过 5 条消息 |

### 倍速控制

点击工具栏中的倍速按钮：
- **0.5x** - 慢速播放
- **1x** - 正常速度
- **2x** - 快速播放
- **5x** - 极速播放

## 常见问题

### Q: 如何找到会话 ID？

A: 会话 ID 在 JSONL 文件路径中：
```
/root/.openclaw/agents/main/sessions/<session-id>.jsonl
```

### Q: 转换后的文件在哪？

A: 默认在 `recordings/` 目录：
```
/zed/workspace/skills/session-player/recordings/<session-id>-full.json
```

### Q: 如何删除录制文件？

A: 直接删除 `recordings/` 目录中的 JSON 文件：
```bash
rm /zed/workspace/skills/session-player/recordings/<filename>.json
```

### Q: 播放器显示"加载失败"？

A: 检查：
1. 服务器是否运行
2. 录制文件是否存在
3. 浏览器控制台是否有错误

### Q: 如何分享录制文件？

A: 将 JSON 文件复制给他人，他们可以用自己的 session-player 播放。

## 输出示例

### 转换输出

```
📖 读取 JSONL 文件：/root/.openclaw/agents/main/sessions/ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f.jsonl
📝 共 178 行记录
✨ 转换完成：279 条消息
💾 已保存到：/zed/workspace/skills/session-player/recordings/ec0e11eb-be13-4cdb-b1fe-0dfb19f1d67f-full.json
📊 文件大小：665430 bytes

📋 消息预览：
  1. [user] 那你尝试把当前的会话录制一下，然后做一个回放。...
  2. [assistant] 用户想要我录制当前会话并做回放。这是一个有趣的请求...
  3. [assistant] 🔧 调用工具：**sessions_list**...
  4. [tool] {
  "count": 1,
  "sessions": [
    {
      "key":...
  5. [assistant] 好的，我找到了当前会话...

✅ 转换完成！
```

### 服务器输出

```
╔═══════════════════════════════════════════════════════════╗
║       🎬 OpenClaw 会话回放服务器已启动                    ║
╚═══════════════════════════════════════════════════════════╝

📡 服务器地址：http://localhost:3000
📁 录制目录：/zed/workspace/skills/session-player/recordings

按 Ctrl+C 停止服务器
```

---

📄 更多文档：[SKILL.md](./SKILL.md)
