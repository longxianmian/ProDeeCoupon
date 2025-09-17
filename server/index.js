const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// 环境配置检查 - 不强制设置NODE_ENV
// 使用显式环境变量控制开发功能
const ENABLE_DEV_ENDPOINTS = process.env.ENABLE_DEV_ENDPOINTS === 'true';
const ENABLE_DEBUG_ERRORS = process.env.ENABLE_DEBUG_ERRORS === 'true';

if (ENABLE_DEV_ENDPOINTS) {
  console.log('⚠️  开发端点已启用 - 仅用于开发环境');
}
const { testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件 - 配置Helmet CSP允许必要的JavaScript执行
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-eval'", // 允许eval，Vue.js和其他现代框架需要
        "'unsafe-inline'", // 允许内联脚本
        "https://static.line-scdn.net" // 允许LINE LIFF SDK
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
  credentials: true
}));

// LINE webhook必须在express.json之前处理，避免签名验证失败
const lineWebhookRoutes = require('./routes/lineWebhook');
app.use('/api/line', lineWebhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 用于提供上传的图片
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// 提供构建后的前端静态文件
const path = require('path');
const distPath = path.join(__dirname, '..', 'client', 'dist');
const prodeePath = path.join(__dirname, '..', 'client', 'dist-prodee');

// 优先提供React ProDee首页的静态文件（对于assets路径）
app.use('/assets', express.static(path.join(prodeePath, 'assets')));

// 提供Vue应用的静态文件（禁用自动index文件服务，让React首页路由生效）
app.use(express.static(distPath, { index: false }));

// 基础路由
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'PreDee优惠券系统API服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// API路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/db', require('./routes/db'));
app.use('/api/translation', require('./routes/translation'));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: ENABLE_DEBUG_ERRORS ? err.message : '请稍后重试'
  });
});

// 特殊路由：首页使用React ProDee首页
app.get('/', (req, res) => {
  const prodeeIndexPath = path.join(__dirname, '..', 'client', 'dist-prodee', 'index.html');
  res.sendFile(prodeeIndexPath, (err) => {
    if (err) {
      console.error('发送ProDee首页失败:', err);
      // 回退到Vue首页
      const vueIndexPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
      res.sendFile(vueIndexPath);
    }
  });
});

// 前端路由处理 - 对于非API请求返回Vue应用的index.html
app.use('*', (req, res, next) => {
  // 如果是API请求，返回404
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: '接口不存在' });
  }
  
  // 对于其他前端路由，返回Vue应用的index.html
  const indexPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('发送index.html失败:', err);
      res.status(404).json({ error: '页面不存在' });
    }
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    console.log('🔍 正在测试数据库连接...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.warn('⚠️ 数据库连接失败，但服务器将继续启动');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 PreDee优惠券系统API服务启动成功！`);
      console.log(`📡 服务地址: http://0.0.0.0:${PORT}`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'production'}`);
      console.log(`🔧 开发端点: ${ENABLE_DEV_ENDPOINTS ? '已启用' : '已禁用'}`);
      console.log(`🐛 调试错误: ${ENABLE_DEBUG_ERRORS ? '已启用' : '已禁用'}`);
      console.log(`💾 数据库状态: ${dbConnected ? '✅ 已连接' : '❌ 连接失败'}`);
      console.log('');
      console.log('🔗 可用接口:');
      console.log(`   - 服务健康检查: http://0.0.0.0:${PORT}/api/health`);
      console.log(`   - 数据库健康检查: http://0.0.0.0:${PORT}/api/db/health`);
      console.log(`   - 数据库连接测试: http://0.0.0.0:${PORT}/api/db/test`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();