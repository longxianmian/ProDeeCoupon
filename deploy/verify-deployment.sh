#!/bin/bash
# ====================================================
# LINE State 修复 - 部署验证脚本
# ====================================================
# 用途：验证生产环境部署是否成功
# 使用：bash deploy/verify-deployment.sh
# ====================================================

set -e

echo "======================================================"
echo "🔍 LINE State 修复 - 部署验证"
echo "======================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# ====================================================
# 测试 1：服务健康检查
# ====================================================

echo "测试 1/6: 服务健康检查"
echo "----------------------------------------"

HEALTH=$(curl -s https://prodee.replit.app/api/health || echo '{"ok":false}')

if echo "$HEALTH" | grep -q '"ok":true'; then
  echo -e "${GREEN}✅ 通过${NC} - 服务运行正常"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ 失败${NC} - 服务不可用"
  echo "响应: $HEALTH"
  FAILED=$((FAILED + 1))
fi

echo ""

# ====================================================
# 测试 2：数据库字段验证
# ====================================================

echo "测试 2/6: 数据库字段验证"
echo "----------------------------------------"

if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}⚠️  跳过${NC} - DATABASE_URL 未设置"
else
  STATE_LENGTH=$(psql "$DATABASE_URL" -t -c "SELECT character_maximum_length FROM information_schema.columns WHERE table_name='pkce_sessions' AND column_name='state';" | xargs)
  
  if [ "$STATE_LENGTH" = "256" ]; then
    echo -e "${GREEN}✅ 通过${NC} - state 字段长度正确 (256)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ 失败${NC} - state 字段长度异常: $STATE_LENGTH"
    FAILED=$((FAILED + 1))
  fi
fi

echo ""

# ====================================================
# 测试 3：Base64URL 工具文件
# ====================================================

echo "测试 3/6: Base64URL 工具文件"
echo "----------------------------------------"

if [ -f "server/utils/base64url.js" ]; then
  echo -e "${GREEN}✅ 通过${NC} - server/utils/base64url.js 存在"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ 失败${NC} - server/utils/base64url.js 不存在"
  FAILED=$((FAILED + 1))
fi

echo ""

# ====================================================
# 测试 4：LINE 登录入口
# ====================================================

echo "测试 4/6: LINE 登录入口"
echo "----------------------------------------"

LOGIN_RESPONSE=$(curl -s -I https://prodee.replit.app/auth/line/login?returnTo=/test)

if echo "$LOGIN_RESPONSE" | grep -q "Location.*line.me"; then
  echo -e "${GREEN}✅ 通过${NC} - LINE 登录重定向正常"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ 失败${NC} - LINE 登录重定向异常"
  echo "$LOGIN_RESPONSE"
  FAILED=$((FAILED + 1))
fi

echo ""

# ====================================================
# 测试 5：State 参数格式
# ====================================================

echo "测试 5/6: State 参数格式"
echo "----------------------------------------"

STATE_PARAM=$(curl -s -I https://prodee.replit.app/auth/line/login?returnTo=/test | grep "Location" | grep -o "state=[^&]*" | cut -d= -f2)

if echo "$STATE_PARAM" | grep -qE '^[A-Za-z0-9_-]+$'; then
  echo -e "${GREEN}✅ 通过${NC} - state 参数格式正确（Base64URL）"
  echo "示例 state: ${STATE_PARAM:0:40}..."
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ 失败${NC} - state 参数格式异常"
  echo "state: $STATE_PARAM"
  FAILED=$((FAILED + 1))
fi

echo ""

# ====================================================
# 测试 6：环境变量配置
# ====================================================

echo "测试 6/6: 环境变量配置"
echo "----------------------------------------"

ENV_CHECK=0

if [ -n "$LINE_CHANNEL_ID" ]; then
  echo -e "${GREEN}✅${NC} LINE_CHANNEL_ID 已配置"
  ENV_CHECK=$((ENV_CHECK + 1))
else
  echo -e "${RED}❌${NC} LINE_CHANNEL_ID 未配置"
fi

if [ -n "$LINE_CHANNEL_SECRET" ]; then
  echo -e "${GREEN}✅${NC} LINE_CHANNEL_SECRET 已配置"
  ENV_CHECK=$((ENV_CHECK + 1))
else
  echo -e "${RED}❌${NC} LINE_CHANNEL_SECRET 未配置"
fi

if [ -n "$JWT_SECRET" ]; then
  echo -e "${GREEN}✅${NC} JWT_SECRET 已配置"
  ENV_CHECK=$((ENV_CHECK + 1))
else
  echo -e "${RED}❌${NC} JWT_SECRET 未配置"
fi

if [ $ENV_CHECK -eq 3 ]; then
  echo -e "${GREEN}✅ 通过${NC} - 所有必需环境变量已配置"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ 失败${NC} - 环境变量配置不完整 ($ENV_CHECK/3)"
  FAILED=$((FAILED + 1))
fi

echo ""

# ====================================================
# 测试总结
# ====================================================

echo "======================================================"
echo "📊 验证结果总结"
echo "======================================================"
echo ""
echo "总测试数: $((PASSED + FAILED))"
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ 所有测试通过！部署成功！${NC}"
  echo ""
  echo "后续步骤："
  echo "  1. 在 LINE 应用中打开: https://prodee.replit.app"
  echo "  2. 点击 '用 LINE 一键登录'"
  echo "  3. 授权后应成功登录，不再出现 'Invalid state format'"
  echo ""
  exit 0
else
  echo -e "${RED}❌ 部署验证失败！${NC}"
  echo ""
  echo "请检查："
  echo "  1. 服务是否已重启"
  echo "  2. 数据库迁移是否成功"
  echo "  3. 环境变量是否配置正确"
  echo ""
  echo "详细排查请参考: deploy/LINE_STATE_FIX_DEPLOYMENT.md"
  echo ""
  exit 1
fi
