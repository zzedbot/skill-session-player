#!/bin/bash
# OpenClaw Session Player 安装脚本

set -e

SKILL_DIR="/zed/workspace/skills/session-player"
RECORDINGS_DIR="/zed/workspace/skills/session-player/recordings"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     🎬 OpenClaw Session Player 安装脚本                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本：$(node -v)"
echo ""

# 创建目录
echo "📁 创建目录..."
mkdir -p "$RECORDINGS_DIR"

# 安装依赖
echo "📦 安装依赖..."
cd "$SKILL_DIR"
npm install

echo ""
echo "✅ 安装完成！"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 使用指南："
echo ""
echo "1. 转换会话："
echo "   node $SKILL_DIR/convert-jsonl.js <session-id>"
echo ""
echo "2. 启动服务器："
echo "   cd $SKILL_DIR && npm start"
echo ""
echo "3. 访问播放器："
echo "   http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 详细文档：$SKILL_DIR/SKILL.md"
echo ""
