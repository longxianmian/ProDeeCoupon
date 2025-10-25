/**
 * Facebook IAB 登录功能数据库迁移脚本
 * 
 * 变更内容：
 * 1. 在 users 表添加 facebook_user_id 字段
 * 2. 将 line_id 字段改为可选（允许 Facebook 单独登录）
 * 
 * 使用方法：
 * node server/scripts/migrate-facebook-login.js
 */

require('dotenv').config();
const { pool } = require('../db');

async function migrate() {
  console.log('=================================');
  console.log('📱 Facebook IAB 登录功能迁移');
  console.log('=================================\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('📋 步骤 1/3: 检查 users 表现有结构...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('line_id', 'facebook_user_id')
      ORDER BY ordinal_position;
    `);
    
    console.log('   当前字段:', tableInfo.rows.map(r => `${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`).join(', '));
    console.log('');

    // 步骤 2: 将 line_id 改为可选
    console.log('📋 步骤 2/3: 将 line_id 字段改为可选...');
    const hasLineId = tableInfo.rows.some(r => r.column_name === 'line_id');
    
    if (hasLineId) {
      await client.query('ALTER TABLE users ALTER COLUMN line_id DROP NOT NULL;');
      console.log('   ✅ line_id 已改为可选（允许纯 Facebook 用户）');
    } else {
      console.log('   ⚠️  line_id 字段不存在，跳过');
    }
    console.log('');

    // 步骤 3: 添加 facebook_user_id 字段
    console.log('📋 步骤 3/3: 添加 facebook_user_id 字段...');
    const hasFacebookId = tableInfo.rows.some(r => r.column_name === 'facebook_user_id');
    
    if (!hasFacebookId) {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN facebook_user_id VARCHAR(100) UNIQUE;
      `);
      console.log('   ✅ facebook_user_id 字段已添加');
      
      // 创建索引以提高查询性能
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_facebook_user_id 
        ON users(facebook_user_id);
      `);
      console.log('   ✅ 索引已创建');
    } else {
      console.log('   ✅ facebook_user_id 字段已存在，跳过');
    }
    console.log('');

    await client.query('COMMIT');

    // 验证迁移结果
    console.log('🔍 验证迁移结果...');
    const finalCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('line_id', 'facebook_user_id')
      ORDER BY ordinal_position;
    `);
    
    console.log('');
    console.log('=================================');
    console.log('✅ 迁移完成！');
    console.log('=================================');
    console.log('📊 最终结构:');
    finalCheck.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}(${row.character_maximum_length || 'N/A'}) ${row.is_nullable === 'YES' ? '可选' : '必填'}`);
    });
    console.log('');
    console.log('📝 说明:');
    console.log('   - line_id: LINE 用户 ID（可选）');
    console.log('   - facebook_user_id: Facebook 用户 ID（可选）');
    console.log('   - 用户至少需要有一个登录方式（LINE 或 Facebook）');
    console.log('=================================\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('=================================');
    console.error('❌ 迁移失败！');
    console.error('=================================');
    console.error('错误信息:', error.message);
    console.error('错误详情:', error.detail || 'N/A');
    console.error('');
    console.error('💡 解决建议:');
    console.error('   1. 检查数据库连接是否正常');
    console.error('   2. 确认 DATABASE_URL 环境变量已设置');
    console.error('   3. 检查是否有足够的数据库权限');
    console.error('   4. 如果字段已存在，可以安全忽略此错误');
    console.error('=================================\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// 执行迁移
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
