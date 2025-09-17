const express = require('express');
const router = express.Router();
const { testConnection, getDatabaseInfo } = require('../db');

// 数据库健康检查接口
router.get('/health', async (req, res) => {
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      const dbInfo = await getDatabaseInfo();
      res.json({
        status: 'OK',
        message: '数据库连接正常',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          version: dbInfo.version.split(' ')[0] + ' ' + dbInfo.version.split(' ')[1], // 简化版本信息
          server_time: dbInfo.current_time,
          active_connections: dbInfo.active_connections,
          pool_status: {
            total: dbInfo.pool_total_count,
            idle: dbInfo.pool_idle_count,
            waiting: dbInfo.pool_waiting_count
          }
        }
      });
    } else {
      res.status(503).json({
        status: 'ERROR',
        message: '数据库连接失败',
        timestamp: new Date().toISOString(),
        database: {
          connected: false
        }
      });
    }
  } catch (error) {
    console.error('数据库健康检查失败:', error);
    res.status(503).json({
      status: 'ERROR',
      message: '数据库健康检查失败',
      error: error.message,
      timestamp: new Date().toISOString(),
      database: {
        connected: false
      }
    });
  }
});

// 数据库连接测试接口
router.get('/test', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({
      status: isConnected ? 'OK' : 'ERROR',
      message: isConnected ? '数据库连接测试成功' : '数据库连接测试失败',
      timestamp: new Date().toISOString(),
      connected: isConnected
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: '数据库连接测试异常',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;