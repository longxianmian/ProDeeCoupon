/**
 * 生产环境验证脚本
 * 用途：检查生产数据库的健康状态和关键配置
 * 
 * 使用方法: node server/scripts/verify-production.js
 */

require('dotenv').config();
const { pool } = require('../db');

async function verifyProduction() {
  console.log('=================================');
  console.log('🔍 开始验证生产环境');
  console.log('=================================\n');
  
  const checks = [];
  
  try {
    // 1. 数据库连接
    console.log('📋 检查 1/8: 数据库连接...');
    await pool.query("SELECT 1");
    checks.push({ name: '数据库连接', status: '✅ 通过' });
    
    // 2. 表结构检查
    console.log('📋 检查 2/8: 数据库表结构...');
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    const requiredTables = [
      'admins', 'users', 'coupons', 'stores', 'user_coupons',
      'posts', 'reward_items', 'reward_redemptions',
      'point_transactions', 'point_buckets', 'point_rules'
    ];
    const existingTables = tables.rows.map(r => r.tablename);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      checks.push({ 
        name: '表结构', 
        status: `⚠️  缺少 ${missingTables.length} 张表: ${missingTables.join(', ')}` 
      });
    } else {
      checks.push({ name: '表结构', status: `✅ 完整 (${existingTables.length}张表)` });
    }
    
    // 3. 管理员账户
    console.log('📋 检查 3/8: 管理员账户...');
    const admins = await pool.query("SELECT COUNT(*) as count, role FROM admins GROUP BY role");
    const adminStats = admins.rows.reduce((acc, row) => {
      acc[row.role] = parseInt(row.count);
      return acc;
    }, {});
    
    if (adminStats.super_admin > 0) {
      checks.push({ 
        name: '管理员账户', 
        status: `✅ 已配置 (super_admin: ${adminStats.super_admin || 0}, content_operator: ${adminStats.content_operator || 0})` 
      });
    } else {
      checks.push({ name: '管理员账户', status: '❌ 未配置' });
    }
    
    // 4. 积分规则
    console.log('📋 检查 4/8: 积分规则...');
    const rules = await pool.query("SELECT COUNT(*) as count FROM point_rules");
    const ruleCount = parseInt(rules.rows[0].count);
    checks.push({ 
      name: '积分规则', 
      status: ruleCount > 0 ? `✅ 已配置 (${ruleCount}条)` : '⚠️  未配置' 
    });
    
    // 5. 门店信息
    console.log('📋 检查 5/8: 门店信息...');
    const stores = await pool.query("SELECT COUNT(*) as count FROM stores WHERE status = 'active'");
    const storeCount = parseInt(stores.rows[0].count);
    checks.push({ 
      name: '门店信息', 
      status: storeCount > 0 ? `✅ 已配置 (${storeCount}个)` : '⚠️  未配置' 
    });
    
    // 6. 环境变量
    console.log('📋 检查 6/8: 环境变量...');
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'LINE_CHANNEL_ACCESS_TOKEN',
      'LINE_CHANNEL_SECRET',
      'VITE_LINE_LIFF_ID'
    ];
    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingEnvVars.length > 0) {
      checks.push({ 
        name: '环境变量', 
        status: `⚠️  缺少: ${missingEnvVars.join(', ')}` 
      });
    } else {
      checks.push({ name: '环境变量', status: '✅ 完整' });
    }
    
    // 7. 对象存储
    console.log('📋 检查 7/8: 对象存储配置...');
    const storageEnvVars = ['PRIVATE_OBJECT_DIR', 'PUBLIC_OBJECT_SEARCH_PATHS'];
    const hasStorage = storageEnvVars.every(v => process.env[v]);
    checks.push({ 
      name: '对象存储', 
      status: hasStorage ? '✅ 已配置' : '⚠️  未配置' 
    });
    
    // 8. 用户数据
    console.log('📋 检查 8/8: 用户数据统计...');
    const users = await pool.query("SELECT COUNT(*) as count FROM users");
    const userCount = parseInt(users.rows[0].count);
    checks.push({ 
      name: '用户数据', 
      status: `📊 ${userCount} 个用户` 
    });
    
    // 输出报告
    console.log('\n=================================');
    console.log('📊 验证报告');
    console.log('=================================\n');
    
    checks.forEach(check => {
      console.log(`${check.name.padEnd(20)} ${check.status}`);
    });
    
    console.log('\n=================================');
    
    // 判断总体状态
    const hasErrors = checks.some(c => c.status.includes('❌'));
    const hasWarnings = checks.some(c => c.status.includes('⚠️'));
    
    if (hasErrors) {
      console.log('❌ 生产环境存在严重问题，需要立即修复');
      console.log('💡 建议运行: node server/scripts/init-production.js');
    } else if (hasWarnings) {
      console.log('⚠️  生产环境可用，但建议完善配置');
    } else {
      console.log('✅ 生产环境一切正常');
    }
    
    console.log('=================================\n');
    
  } catch (error) {
    console.error('\n❌ 验证过程出错:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 执行验证
if (require.main === module) {
  verifyProduction();
}

module.exports = { verifyProduction };
