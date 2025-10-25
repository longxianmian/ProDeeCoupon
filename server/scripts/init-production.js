/**
 * 生产环境数据库初始化脚本
 * 用途：首次部署后初始化生产数据库的必要数据
 * 
 * 使用方法：
 * 1. 在生产环境设置环境变量 INIT_ADMIN_PASSWORD
 * 2. 运行: node server/scripts/init-production.js
 * 3. 脚本会检查是否已初始化，避免重复执行
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

// 配置项
const CONFIG = {
  // 超级管理员账户
  ADMIN: {
    username: 'admin',
    password: process.env.INIT_ADMIN_PASSWORD || 'Admin@123456', // 请在生产环境通过环境变量设置
    email: 'admin@prodee.com',
    display_name: '系统管理员',
    role: 'super_admin'
  },
  
  // 内容运营账户
  OPERATOR: {
    username: 'operator',
    password: process.env.INIT_OPERATOR_PASSWORD || 'Operator@123456',
    email: 'operator@prodee.com',
    display_name: '内容运营',
    role: 'content_operator'
  }
};

// 初始化检查
async function checkIfInitialized() {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM admins WHERE role = 'super_admin'"
    );
    const count = parseInt(result.rows[0].count);
    return count > 0;
  } catch (error) {
    console.error('检查初始化状态失败:', error.message);
    throw error;
  }
}

// 创建管理员账户
async function createAdmin(config) {
  const passwordHash = await bcrypt.hash(config.password, 10);
  
  await pool.query({
    text: `
      INSERT INTO admins (username, password_hash, email, display_name, role, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `,
    values: [
      config.username,
      passwordHash,
      config.email,
      config.display_name,
      config.role
    ]
  });
  
  console.log(`✅ 创建管理员账户: ${config.username} (${config.role})`);
}

// 创建默认积分规则（key-value格式）
async function createPointRules() {
  const rules = {
    'daily_signin_points': '10',
    'coupon_use_points': '50',
    'share_post_points': '5',
    'points_to_thb_rate': '100',  // 100积分 = 1泰铢
    'max_points_discount_percent': '30'  // 最多使用30%积分抵扣
  };
  
  for (const [key, value] of Object.entries(rules)) {
    await pool.query({
      text: `
        INSERT INTO point_rules (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = $2
      `,
      values: [key, value]
    });
  }
  
  console.log(`✅ 创建 ${Object.keys(rules).length} 条积分规则`);
}

// 创建示例门店（可选）
async function createSampleStore() {
  await pool.query({
    text: `
      INSERT INTO stores (
        name, name_zh_cn, name_en_us, name_th_th,
        address, city,
        lat, lng,
        phone, status, created_at
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8,
        $9, $10, NOW()
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `,
    values: [
      'ProDee总店', 'ProDee总店', 'ProDee Main Store', 'สาขาหลัก ProDee',
      'Bangkok Downtown', 'bangkok',
      13.7563, 100.5018,
      '+66-2-xxx-xxxx', 'active'
    ]
  });
  
  console.log('✅ 创建示例门店');
}

// 创建Rich Menu默认配置
async function createRichMenuConfig() {
  const configs = [
    {
      menu_type: 'default',
      menu_name: '默认菜单',
      rich_menu_id: '',
      is_active: false
    },
    {
      menu_type: 'member',
      menu_name: '会员菜单',
      rich_menu_id: '',
      is_active: false
    }
  ];
  
  for (const config of configs) {
    await pool.query({
      text: `
        INSERT INTO rich_menu_configs (menu_type, menu_name, rich_menu_id, is_active, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (menu_type) DO UPDATE 
        SET menu_name = $2, rich_menu_id = $3, is_active = $4
      `,
      values: [
        config.menu_type,
        config.menu_name,
        config.rich_menu_id,
        config.is_active
      ]
    });
  }
  
  console.log(`✅ 创建 ${configs.length} 个Rich Menu配置（需要稍后通过管理后台配置实际菜单）`);
}

// 主初始化函数
async function initProduction() {
  console.log('=================================');
  console.log('🚀 开始初始化生产环境数据库');
  console.log('=================================\n');
  
  try {
    // 1. 检查是否已初始化
    console.log('📋 步骤 1/6: 检查初始化状态...');
    const isInitialized = await checkIfInitialized();
    
    if (isInitialized) {
      console.log('⚠️  数据库已初始化过，跳过管理员创建');
      console.log('   如需重新初始化管理员，请先手动删除现有管理员账户\n');
    } else {
      // 2. 创建管理员账户
      console.log('📋 步骤 2/6: 创建管理员账户...');
      await createAdmin(CONFIG.ADMIN);
      await createAdmin(CONFIG.OPERATOR);
      console.log('');
    }
    
    // 3. 创建积分规则
    console.log('📋 步骤 3/6: 创建积分规则...');
    await createPointRules();
    console.log('');
    
    // 4. 创建示例门店
    console.log('📋 步骤 4/6: 创建示例门店...');
    await createSampleStore();
    console.log('');
    
    // 5. 创建Rich Menu配置
    console.log('📋 步骤 5/6: 创建Rich Menu配置...');
    await createRichMenuConfig();
    console.log('');
    
    // 6. 完成
    console.log('📋 步骤 6/6: 验证初始化结果...');
    const adminCount = await pool.query("SELECT COUNT(*) as count FROM admins");
    const storeCount = await pool.query("SELECT COUNT(*) as count FROM stores");
    const ruleCount = await pool.query("SELECT COUNT(*) as count FROM point_rules");
    
    console.log('');
    console.log('=================================');
    console.log('✅ 生产环境初始化完成！');
    console.log('=================================');
    console.log(`📊 统计信息:`);
    console.log(`   - 管理员账户: ${adminCount.rows[0].count} 个`);
    console.log(`   - 门店数量: ${storeCount.rows[0].count} 个`);
    console.log(`   - 积分规则: ${ruleCount.rows[0].count} 条`);
    console.log('');
    console.log('🔐 管理员登录信息:');
    console.log(`   超级管理员: ${CONFIG.ADMIN.username}`);
    console.log(`   初始密码: ${CONFIG.ADMIN.password}`);
    console.log(`   ⚠️  请立即登录并修改密码！`);
    console.log('');
    console.log(`   内容运营: ${CONFIG.OPERATOR.username}`);
    console.log(`   初始密码: ${CONFIG.OPERATOR.password}`);
    console.log('');
    console.log('📝 后续步骤:');
    console.log('   1. 登录管理后台修改管理员密码');
    console.log('   2. 配置LINE Rich Menu图片和链接');
    console.log('   3. 创建优惠券和奖励商品');
    console.log('   4. 添加更多门店信息');
    console.log('=================================\n');
    
  } catch (error) {
    console.error('');
    console.error('=================================');
    console.error('❌ 初始化失败！');
    console.error('=================================');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('');
    console.error('💡 解决建议:');
    console.error('   1. 检查数据库连接是否正常');
    console.error('   2. 确认DATABASE_URL环境变量已设置');
    console.error('   3. 检查数据库schema是否已同步 (npm run db:push)');
    console.error('=================================\n');
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await pool.end();
  }
}

// 执行初始化
if (require.main === module) {
  initProduction();
}

module.exports = { initProduction };
