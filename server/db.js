const { Pool } = require('pg');
require('dotenv').config();

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // 优化的连接池配置 - 针对Replit环境调优
  max: 8, // 最大连接数 (进一步降低以适应Replit资源限制)
  min: 1, // 最小连接数 (降低到1以减少资源占用)
  idleTimeoutMillis: 180000, // 空闲连接超时时间 (3分钟，适应Replit环境)
  connectionTimeoutMillis: 45000, // 连接超时时间 (45秒，增加容错)
  acquireTimeoutMillis: 30000, // 获取连接超时时间 (30秒)
  createTimeoutMillis: 45000, // 创建连接超时时间 (45秒，增加容错)
  destroyTimeoutMillis: 5000, // 销毁连接超时时间 (5秒)
  reapIntervalMillis: 2000, // 清理连接检查间隔 (2秒，减少检查频率)
  createRetryIntervalMillis: 500, // 重试间隔 (500毫秒，增加重试间隔)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 数据库连接池事件监听
pool.on('connect', () => {
  console.log('✅ 数据库连接池：新连接建立');
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接池错误:', err.code, err.message);
  
  // 对于常见的临时连接中断错误，不要崩溃服务器
  const transientErrors = ['57P01', '57P02', '57P03', '08006', '08003'];
  if (transientErrors.includes(err.code) || /terminating connection/i.test(err.message)) {
    console.log('⚠️ 检测到临时连接中断，连接池将自动恢复');
    return; // 让pg自动创建新连接
  }
  
  console.error('❌ 严重的数据库错误，但服务器继续运行');
});

// 增强的测试数据库连接 (带重试机制)
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔍 数据库连接测试 (第${i + 1}次)...`);
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      console.log('🔗 数据库连接测试成功:', result.rows[0].current_time);
      return true;
    } catch (err) {
      console.error(`❌ 数据库连接测试失败 (第${i + 1}次):`, err.message);
      if (i === retries - 1) {
        console.error('❌ 所有重试均失败，数据库连接不可用');
        return false;
      }
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
};

// 获取数据库状态信息
const getDatabaseInfo = async () => {
  try {
    const client = await pool.connect();
    
    // 获取数据库基本信息
    const versionResult = await client.query('SELECT version()');
    const currentTimeResult = await client.query('SELECT NOW() as current_time');
    const connectionCountResult = await client.query('SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = \'active\'');
    
    client.release();
    
    return {
      version: versionResult.rows[0].version,
      current_time: currentTimeResult.rows[0].current_time,
      active_connections: parseInt(connectionCountResult.rows[0].active_connections),
      pool_total_count: pool.totalCount,
      pool_idle_count: pool.idleCount,
      pool_waiting_count: pool.waitingCount
    };
  } catch (err) {
    throw new Error(`获取数据库信息失败: ${err.message}`);
  }
};

// 健壮的数据库查询包装函数 (带重试和错误处理)
const safeQuery = async (sql, params = [], retries = 2) => {
  for (let i = 0; i < retries; i++) {
    let client = null;
    try {
      console.log(`🔍 执行数据库查询 (第${i + 1}次)...`);
      client = await pool.connect();
      const result = await client.query(sql, params);
      console.log('✅ 数据库查询成功');
      return result;
    } catch (err) {
      console.error(`❌ 数据库查询失败 (第${i + 1}次):`, err.message);
      
      if (i === retries - 1) {
        throw new Error(`数据库查询失败: ${err.message}`);
      }
      
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      if (client) {
        client.release();
      }
    }
  }
};

// 优雅关闭数据库连接池
const gracefulShutdown = async () => {
  try {
    console.log('🔄 正在关闭数据库连接池...');
    await pool.end();
    console.log('✅ 数据库连接池已关闭');
  } catch (err) {
    console.error('❌ 关闭数据库连接池失败:', err);
  }
};

// 进程退出时优雅关闭
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = {
  pool,
  testConnection,
  getDatabaseInfo,
  safeQuery,
  gracefulShutdown
};