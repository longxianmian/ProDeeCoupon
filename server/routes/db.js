const express = require('express');
const router = express.Router();
const { q } = require('../db/query.js');

// 数据库健康检查接口
router.get('/health', async (req, res) => {
  try {
    await q("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, code: e.code, message: e.message });
  }
});

// 数据库连接测试接口
router.get('/test', async (req, res) => {
  try {
    await q("SELECT NOW() as current_time");
    res.json({
      status: 'OK',
      message: '数据库连接测试成功',
      timestamp: new Date().toISOString(),
      connected: true
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