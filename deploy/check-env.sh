#!/bin/bash
# 环境变量检查脚本
# 用途：验证所有必需的环境变量是否已正确配置

echo "=================================================="
echo "ProDee 环境变量配置检查"
echo "=================================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MISSING=0
WARNINGS=0

check_required() {
  VAR_NAME=$1
  VAR_VALUE="${!VAR_NAME}"
  
  echo -n "[$VAR_NAME] "
  if [ -z "$VAR_VALUE" ]; then
    echo -e "${RED}❌ 未设置${NC}"
    MISSING=$((MISSING + 1))
  else
    # 隐藏敏感信息，只显示前4个字符
    DISPLAY_VALUE=$(echo "$VAR_VALUE" | cut -c1-4)
    echo -e "${GREEN}✅ 已设置${NC} (${DISPLAY_VALUE}****)"
  fi
}

check_optional() {
  VAR_NAME=$1
  VAR_VALUE="${!VAR_NAME}"
  DEFAULT=$2
  
  echo -n "[$VAR_NAME] "
  if [ -z "$VAR_VALUE" ]; then
    echo -e "${YELLOW}⚠️  未设置 (将使用默认值: $DEFAULT)${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    DISPLAY_VALUE=$(echo "$VAR_VALUE" | cut -c1-4)
    echo -e "${GREEN}✅ 已设置${NC} (${DISPLAY_VALUE}****)"
  fi
}

echo "📋 必需的环境变量："
echo ""
check_required "LINE_CHANNEL_ID"
check_required "LINE_CHANNEL_SECRET"
check_required "VITE_LINE_LIFF_ID"
check_required "DATABASE_URL"
check_required "JWT_SECRET"

echo ""
echo "📋 可选的环境变量（有默认值）："
echo ""
check_optional "SESSION_COOKIE_NAME" "prodee_session"
check_optional "NODE_ENV" "development"
check_optional "BASE_URL" "https://prodee.replit.app"
check_optional "PRIVATE_OBJECT_DIR" "/prodee-storage/uploads"
check_optional "PUBLIC_OBJECT_SEARCH_PATHS" "/prodee-storage/public"

echo ""
echo "=================================================="
echo "检查结果汇总"
echo "=================================================="

if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✅ 所有必需的环境变量均已配置${NC}"
else
  echo -e "${RED}❌ 缺少 $MISSING 个必需的环境变量${NC}"
  echo ""
  echo "请在 Replit Secrets 中配置缺失的环境变量"
  exit 1
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  有 $WARNINGS 个可选环境变量未配置（将使用默认值）${NC}"
fi

echo ""
echo "=================================================="
echo "🔐 安全性检查"
echo "=================================================="

# 检查 JWT_SECRET 强度
if [ -n "$JWT_SECRET" ]; then
  JWT_LEN=${#JWT_SECRET}
  echo -n "[JWT_SECRET 强度] "
  if [ $JWT_LEN -ge 32 ]; then
    echo -e "${GREEN}✅ 强度足够 ($JWT_LEN 字符)${NC}"
  else
    echo -e "${RED}❌ 强度不足 ($JWT_LEN 字符，建议至少 32 字符)${NC}"
    MISSING=$((MISSING + 1))
  fi
fi

# 检查 NODE_ENV 设置
echo -n "[NODE_ENV] "
if [ "$NODE_ENV" = "production" ]; then
  echo -e "${GREEN}✅ 生产环境配置正确${NC}"
elif [ "$NODE_ENV" = "development" ]; then
  echo -e "${YELLOW}⚠️  当前为开发环境${NC}"
else
  echo -e "${YELLOW}⚠️  环境未明确设置 (当前: ${NODE_ENV:-未设置})${NC}"
fi

echo ""
if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✅ 环境配置检查通过！可以继续部署。${NC}"
  exit 0
else
  echo -e "${RED}❌ 环境配置检查失败！请修复上述问题后再部署。${NC}"
  exit 1
fi
