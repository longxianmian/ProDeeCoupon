#!/bin/bash
# 生产环境数据库迁移脚本
# 用途：扩展 pkce_sessions 表字段长度，支持 LINE LOGIN PKCE 流程
# 安全性：幂等设计，可重复执行，不会破坏现有数据

set -e  # 遇到错误立即退出

echo "=================================================="
echo "ProDee 生产环境数据库迁移"
echo "迁移内容：扩展 pkce_sessions 表字段长度"
echo "=================================================="
echo ""

# 检查是否提供了 DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ 错误：未设置 DATABASE_URL 环境变量"
  echo ""
  echo "使用方法："
  echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
  echo "  bash deploy/migrate-production-db.sh"
  exit 1
fi

echo "✅ DATABASE_URL 已设置"
echo ""

# 显示数据库连接信息（隐藏密码）
DB_INFO=$(echo "$DATABASE_URL" | sed -E 's/(:[^:@]*@)/:***@/')
echo "📡 数据库连接: $DB_INFO"
echo ""

# 确认操作
read -p "⚠️  确认要在生产环境执行数据库迁移吗？(输入 yes 继续): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "❌ 操作已取消"
  exit 0
fi

echo ""
echo "🚀 开始执行迁移..."
echo ""

# 执行迁移 SQL
psql "$DATABASE_URL" -f server/migrations/20251022_extend_pkce_sessions.sql

echo ""
echo "✅ 数据库迁移执行完成！"
echo ""

# 验证迁移结果
echo "🔍 验证迁移结果..."
echo ""

VERIFY_SQL="
SELECT 
  column_name, 
  data_type, 
  character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'pkce_sessions' 
ORDER BY column_name;
"

psql "$DATABASE_URL" -c "$VERIFY_SQL"

echo ""
echo "=================================================="
echo "✅ 迁移完成！请检查上方字段长度："
echo "   - state: 应为 128"
echo "   - code_verifier: 应为 256"
echo "   - nonce: 应为 128"
echo "   - return_path: 应为 text"
echo "=================================================="
