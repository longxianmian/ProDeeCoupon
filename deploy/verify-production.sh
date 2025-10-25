#!/bin/bash
# 生产环境部署验证脚本
# 用途：自动化验证所有关键功能是否正常工作

set -e

PROD_URL="${PROD_URL:-https://prodee.replit.app}"

echo "=================================================="
echo "ProDee 生产环境验证"
echo "目标环境: $PROD_URL"
echo "=================================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
TOTAL=0
PASSED=0
FAILED=0

test_case() {
  TOTAL=$((TOTAL + 1))
  echo -n "[$TOTAL] $1 ... "
}

pass() {
  PASSED=$((PASSED + 1))
  echo -e "${GREEN}✅ PASS${NC}"
}

fail() {
  FAILED=$((FAILED + 1))
  echo -e "${RED}❌ FAIL${NC}"
  if [ -n "$1" ]; then
    echo "    错误: $1"
  fi
}

warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}"
  if [ -n "$1" ]; then
    echo "    警告: $1"
  fi
}

echo "🔍 开始验证..."
echo ""

# 测试1：健康检查
test_case "服务健康检查 (/api/health)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$PROD_URL/api/health" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"ok":true'; then
  pass
else
  fail "HTTP $HTTP_CODE, Body: $BODY"
fi

# 测试2：Cookie 写入端点
test_case "Cookie 写入端点 (/__debug/write)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$PROD_URL/__debug/write" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  pass
else
  fail "HTTP $HTTP_CODE"
fi

# 测试3：Cookie 读取端点
test_case "Cookie 读取端点 (/__debug/read)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$PROD_URL/__debug/read" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q 'cookies'; then
  pass
else
  fail "HTTP $HTTP_CODE, Body: $BODY"
fi

# 测试4：OAuth 登录入口
test_case "OAuth 登录入口 (/auth/line/login)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/auth/line/login?returnTo=/" 2>/dev/null || echo "000")

if [ "$RESPONSE" = "302" ]; then
  pass
else
  fail "期望 302 重定向，实际 HTTP $RESPONSE"
fi

# 测试5：LIFF Exchange API（结构测试）
test_case "LIFF Exchange API 结构 (/api/auth/line/liff/exchange)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROD_URL/api/auth/line/liff/exchange" \
  -H "Content-Type: application/json" \
  -d '{"idToken":"invalid_token_for_test"}' 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

# 应该返回 400 或 401，且包含 success:false
if ([ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]) && echo "$BODY" | grep -q '"success":false'; then
  pass
else
  fail "期望 400/401 with success:false，实际 HTTP $HTTP_CODE, Body: $BODY"
fi

# 测试6：测试页面可访问性
test_case "测试页面可访问 (/test-login.html)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/test-login.html" 2>/dev/null || echo "000")

if [ "$RESPONSE" = "200" ]; then
  pass
else
  fail "HTTP $RESPONSE"
fi

# 测试7：LIFF SDK 脚本加载
test_case "LIFF SDK 脚本可访问"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://static.line-scdn.net/liff/edge/2/sdk.js" 2>/dev/null || echo "000")

if [ "$RESPONSE" = "200" ]; then
  pass
else
  warn "LINE SDK 可能暂时不可用: HTTP $RESPONSE"
  TOTAL=$((TOTAL - 1))  # 不计入总数
fi

echo ""
echo "=================================================="
echo "验证结果汇总"
echo "=================================================="
echo "总计: $TOTAL 项测试"
echo -e "${GREEN}通过: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}失败: $FAILED${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ 所有核心功能验证通过！${NC}"
  echo ""
  echo "建议进行手动测试："
  echo "1. 浏览器访问: $PROD_URL/test-login.html"
  echo "2. 在 LINE 应用内测试 LIFF 登录"
  echo "3. 在外部浏览器测试 OAuth PKCE 登录"
  exit 0
else
  echo -e "${RED}❌ 部分测试失败，请检查上述错误信息${NC}"
  exit 1
fi
