-- ====================================================
-- LINE OAuth State 修复 - 生产数据库迁移脚本
-- ====================================================
-- 日期: 2025-10-21
-- 目的: 扩展 pkce_sessions.state 字段长度以支持长路径
-- 安全性: 幂等操作，向后兼容，无数据丢失风险
-- ====================================================

BEGIN;

-- 记录迁移开始
DO $$
BEGIN
  RAISE NOTICE '🚀 开始 LINE State 修复数据库迁移...';
  RAISE NOTICE '📅 迁移时间: %', NOW();
END $$;

-- ====================================================
-- 1. 扩展 state 字段长度
-- ====================================================

-- 检查当前字段长度
DO $$
DECLARE
  current_length INTEGER;
BEGIN
  SELECT character_maximum_length INTO current_length
  FROM information_schema.columns
  WHERE table_name = 'pkce_sessions' AND column_name = 'state';
  
  RAISE NOTICE '当前 state 字段长度: %', current_length;
END $$;

-- 执行字段扩展（幂等操作）
ALTER TABLE pkce_sessions 
  ALTER COLUMN state TYPE varchar(256);

RAISE NOTICE '✅ state 字段已扩展到 varchar(256)';

-- ====================================================
-- 2. 验证迁移结果
-- ====================================================

DO $$
DECLARE
  state_length INTEGER;
  code_verifier_length INTEGER;
  nonce_length INTEGER;
  return_path_type TEXT;
BEGIN
  -- 检查 state 字段
  SELECT character_maximum_length INTO state_length
  FROM information_schema.columns
  WHERE table_name = 'pkce_sessions' AND column_name = 'state';
  
  -- 检查 code_verifier 字段
  SELECT character_maximum_length INTO code_verifier_length
  FROM information_schema.columns
  WHERE table_name = 'pkce_sessions' AND column_name = 'code_verifier';
  
  -- 检查 nonce 字段
  SELECT character_maximum_length INTO nonce_length
  FROM information_schema.columns
  WHERE table_name = 'pkce_sessions' AND column_name = 'nonce';
  
  -- 检查 return_path 字段类型
  SELECT data_type INTO return_path_type
  FROM information_schema.columns
  WHERE table_name = 'pkce_sessions' AND column_name = 'return_path';
  
  -- 输出验证结果
  RAISE NOTICE '====================================================';
  RAISE NOTICE '字段长度验证结果:';
  RAISE NOTICE '  - state: % (预期: 256)', state_length;
  RAISE NOTICE '  - code_verifier: % (预期: 256)', code_verifier_length;
  RAISE NOTICE '  - nonce: % (预期: 128)', nonce_length;
  RAISE NOTICE '  - return_path: % (预期: text)', return_path_type;
  RAISE NOTICE '====================================================';
  
  -- 验证是否符合预期
  IF state_length = 256 AND code_verifier_length = 256 AND nonce_length = 128 AND return_path_type = 'text' THEN
    RAISE NOTICE '✅ 所有字段验证通过！';
  ELSE
    RAISE EXCEPTION '❌ 字段验证失败，请检查上方输出';
  END IF;
END $$;

-- ====================================================
-- 3. 清理过期会话（可选）
-- ====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 删除已过期的 OAuth 会话
  DELETE FROM pkce_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE '🧹 已清理 % 个过期的 OAuth 会话', deleted_count;
  ELSE
    RAISE NOTICE 'ℹ️  无需清理过期会话';
  END IF;
END $$;

-- ====================================================
-- 4. 提交事务
-- ====================================================

COMMIT;

-- 最终确认
DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ 数据库迁移成功完成！';
  RAISE NOTICE '📅 完成时间: %', NOW();
  RAISE NOTICE '====================================================';
END $$;
