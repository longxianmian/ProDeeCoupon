#!/bin/bash
# ====================================================
# LINE State 修复 - 生产环境快速部署脚本
# ====================================================
# 用途：一键完成所有部署步骤
# 使用：bash deploy/quick-deploy.sh
# ====================================================

set -e

echo "======================================================"
echo "🚀 LINE State 修复 - 生产环境部署"
echo "======================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ====================================================
# 步骤 1：环境检查
# ====================================================

echo "📋 步骤 1/4: 环境检查"
echo "----------------------------------------"

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ 错误：DATABASE_URL 环境变量未设置${NC}"
  echo ""
  echo "请先设置生产数据库 URL："
  echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
  exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL 已设置${NC}"

# 检查必要文件
if [ ! -f "server/utils/base64url.js" ]; then
  echo -e "${RED}❌ 错误：server/utils/base64url.js 文件不存在${NC}"
  exit 1
fi

if [ ! -f "deploy/production-db-migration.sql" ]; then
  echo -e "${RED}❌ 错误：数据库迁移脚本不存在${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 必要文件检查通过${NC}"
echo ""

# ====================================================
# 步骤 2：数据库迁移
# ====================================================

echo "📋 步骤 2/4: 生产数据库迁移"
echo "----------------------------------------"

echo -e "${YELLOW}⚠️  即将对生产数据库执行迁移操作${NC}"
echo "迁移内容："
echo "  - 扩展 pkce_sessions.state 字段：varchar(128) → varchar(256)"
echo ""

read -p "确认继续？(输入 yes): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}❌ 操作已取消${NC}"
  exit 0
fi

echo ""
echo "🔄 执行数据库迁移..."

psql "$DATABASE_URL" -f deploy/production-db-migration.sql

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ 数据库迁移成功${NC}"
else
  echo -e "${RED}❌ 数据库迁移失败${NC}"
  exit 1
fi

echo ""

# ====================================================
# 步骤 3：验证数据库
# ====================================================

echo "📋 步骤 3/4: 验证数据库变更"
echo "----------------------------------------"

VERIFY_SQL="
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'pkce_sessions' AND column_name = 'state';
"

echo "查询 state 字段信息..."
RESULT=$(psql "$DATABASE_URL" -t -c "$VERIFY_SQL")

if echo "$RESULT" | grep -q "256"; then
  echo -e "${GREEN}✅ state 字段长度验证通过 (256)${NC}"
else
  echo -e "${RED}❌ state 字段长度验证失败${NC}"
  echo "查询结果: $RESULT"
  exit 1
fi

echo ""

# ====================================================
# 步骤 4：提示重启服务
# ====================================================

echo "📋 步骤 4/4: 重启服务"
echo "----------------------------------------"

echo -e "${YELLOW}⚠️  请手动重启服务以应用代码变更：${NC}"
echo ""
echo "方式1（推荐）："
echo "  在 Replit 界面点击 'Stop' 然后点击 'Run'"
echo ""
echo "方式2："
echo "  服务会在代码变更后自动重启"
echo ""

# ====================================================
# 完成
# ====================================================

echo "======================================================"
echo -e "${GREEN}✅ 部署准备完成！${NC}"
echo "======================================================"
echo ""
echo "后续步骤："
echo "  1. 重启服务（见上方提示）"
echo "  2. 运行验证脚本: bash deploy/verify-deployment.sh"
echo "  3. 在 LINE 应用中测试登录"
echo ""
echo "详细文档："
echo "  deploy/LINE_STATE_FIX_DEPLOYMENT.md"
echo ""
