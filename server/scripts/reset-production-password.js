/**
 * 生产环境管理员密码重置脚本
 * 
 * 使用方法：
 * 1. 设置环境变量 RESET_EMAIL 和 RESET_PASSWORD
 * 2. 运行: RESET_EMAIL=admin@prodee.com RESET_PASSWORD=Wjbb5260 node server/scripts/reset-production-password.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

async function resetPassword() {
  const email = process.env.RESET_EMAIL || 'admin@prodee.com';
  const newPassword = process.env.RESET_PASSWORD || 'Wjbb5260';
  
  console.log('=================================');
  console.log('🔐 重置生产环境管理员密码');
  console.log('=================================\n');
  
  try {
    // 生成新密码的hash
    console.log('📝 生成密码hash...');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // 更新数据库
    console.log(`📊 更新账号: ${email}`);
    const result = await pool.query({
      text: `
        UPDATE admins 
        SET password = $1, updated_at = NOW() 
        WHERE email = $2 
        RETURNING email, role, display_name
      `,
      values: [passwordHash, email]
    });
    
    if (result.rows.length === 0) {
      console.log('❌ 账号不存在:', email);
      console.log('   请检查邮箱是否正确\n');
      process.exit(1);
    }
    
    const admin = result.rows[0];
    console.log('\n✅ 密码重置成功！');
    console.log('=================================');
    console.log('📋 账号信息:');
    console.log(`   邮箱: ${admin.email}`);
    console.log(`   角色: ${admin.role}`);
    console.log(`   显示名: ${admin.display_name || '无'}`);
    console.log(`   新密码: ${newPassword}`);
    console.log('=================================\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 密码重置失败:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// 执行重置
resetPassword();
