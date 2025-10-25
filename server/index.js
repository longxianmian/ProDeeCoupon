const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const QRCode = require('qrcode');
require('dotenv').config();
// 加载存储配置
require('dotenv').config({ path: '.env.storage' });

// 日志工具
const logger = require('./utils/logger');

// 启动体检：确保对象存储配置正确
// Replit App Storage 使用内置认证，但需要设置必要的环境变量
process.env.PRIVATE_OBJECT_DIR = process.env.PRIVATE_OBJECT_DIR || '/prodee-storage/uploads';
process.env.PUBLIC_OBJECT_SEARCH_PATHS = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '/prodee-storage/public';

// 环境配置检查 - 不强制设置NODE_ENV
// 使用显式环境变量控制开发功能
const ENABLE_DEV_ENDPOINTS = process.env.ENABLE_DEV_ENDPOINTS === 'true';
const ENABLE_DEBUG_ERRORS = process.env.ENABLE_DEBUG_ERRORS === 'true';
const ENABLE_DEBUG = process.env.ENABLE_DEBUG === 'true';

if (ENABLE_DEV_ENDPOINTS) {
  logger.warn('⚠️  开发端点已启用 - 仅用于开发环境');
}
// 统一使用storage.js的数据库连接
const { dbService } = require('./storage.js');
const { poolMetrics } = require('./middlewares/pool-metrics.js');

const app = express();
const PORT = process.env.PORT || 5000;

// 基础 URL 配置（生产环境必须使用完整域名）
const BASE_URL = process.env.BASE_URL || 'https://prodee.replit.app';

// 信任代理 - 关键：使Secure Cookie在HTTPS代理下生效
app.set('trust proxy', 1);

// 统一的跨站安全 Cookie 选项（登录前 state/PKCE，登录后会话都用它）
// 重要：不设置 domain，让浏览器自动绑定到当前域名（避免跨域问题）
const COOKIE_BASE_OPTS = {
  httpOnly: true,
  secure: true,       // 仅 HTTPS
  sameSite: 'none',   // 允许跨站回跳（access.line.me -> prodee.replit.app）
  path: '/'           // 全站可用
  // 不设置 domain - 让浏览器自动处理，这样 Cookie 只在当前域名有效
};
app.locals.COOKIE_BASE_OPTS = COOKIE_BASE_OPTS;
app.locals.BASE_URL = BASE_URL;

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
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "data:"],
      frameSrc: ["'self'"]
    },
  },
  // 关键修复：允许跨源引用（前端在spock.replit.dev，图片在prodee.replit.app）
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,     // 防止意外开启COOP
  crossOriginEmbedderPolicy: false    // 防止意外开启COEP
}));
// CORS配置 - 允许多个Replit域名访问
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'https://prodee.replit.app',
  process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : null,
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null
].filter(Boolean); // 过滤掉null值

app.use(cors({
  origin: function (origin, callback) {
    // 允许没有origin的请求（如移动应用、Postman等）
    if (!origin) return callback(null, true);
    
    // 检查是否在允许列表中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } 
    // 允许所有 .replit.dev 和 .replit.app 域名（开发和生产环境）
    else if (origin.endsWith('.replit.dev') || origin.endsWith('.replit.app')) {
      logger.debug(`✅ CORS允许Replit域名: ${origin}`);
      callback(null, true);
    } 
    else {
      logger.warn(`⚠️ CORS拒绝来自 ${origin} 的请求，允许的域名:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ⚠️ 关键：Cookie解析必须在所有路由之前！
app.use(cookieParser(process.env.JWT_SECRET));

// ⚠️ 关键：全局会话注入中间件 - 为所有API注入req.user
const { optionalAuth } = require('./middleware/auth');
app.use(optionalAuth);

// 请求体解析中间件，支持大文件上传
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// LINE webhook必须在express.json之前处理，避免签名验证失败
const lineWebhookRoutes = require('./routes/lineWebhook');
app.use('/api/line', lineWebhookRoutes);

// ⚠️ 旧的PKCE登录路由已废弃（与新系统冲突）
// const authLineRoutes = require('./auth-line');
// app.use('/auth/line', authLineRoutes);

// 新的统一登录路由（支持OAuth PKCE + LIFF Token Exchange）
const lineLoginRouter = require('./auth/lineLogin');
app.use(lineLoginRouter);

// --- Debug helpers for LINE WebView cookie behavior ---
app.get('/__debug/write', (req, res) => {
  res.cookie('__probe', 'ok', { path: '/', sameSite: 'none', secure: true });
  res.type('text/plain').send('wrote cookie __probe=ok; open /__debug/read');
});

app.get('/__debug/read', (req, res) => {
  res.type('application/json').send(JSON.stringify({ cookies: req.cookies || {} }));
});

// ⚠️ 已移除旧的全局认证中间件，改用optionalAuth（已在上方注册）
// 旧代码用于强制登录拦截，现在改为由各路由自行决定是否需要登录
const jwt = require('jsonwebtoken');
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'prodee_session';
const JWT_SECRET = process.env.JWT_SECRET;

app.use((req, res, next) => {
  // === 开发环境标记已由optionalAuth处理，这里仅做路径拦截 ===
  // if (process.env.NODE_ENV !== 'production' && process.env.DEV_SKIP_AUTH === '1') {
  //   已由optionalAuth处理
  // }
  // === 开发环境绕过认证结束 ===
  
  // 需要登录的接口路径（按需增加）
  const needAuth = req.path.startsWith('/api/coupons/') && req.path.includes('/claim')
                || req.path === '/api/coupons/claim'
                || req.path.startsWith('/api/points/') && req.path.includes('/claim');

  if (!needAuth) return next();

  try {
    // 优先从Cookie获取token，其次从Authorization header
    const cookieToken = req.cookies?.[COOKIE_NAME];
    const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const token = cookieToken || headerToken;
    
    if (!token) {
      logger.warn('🚫 游客尝试访问受保护接口:', req.path);
      return res.status(401).json({ code: 401, msg: 'UNAUTHORIZED', error: '需要登录' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { 
      id: payload.id || String(payload.sub),
      line_id: payload.line_id,
      nickname: payload.nickname,
      ...payload 
    };
    logger.debug('✅ 认证成功:', req.user.id);
    return next();
  } catch (err) {
    logger.warn('🚫 认证失败:', err.message);
    return res.status(401).json({ code: 401, msg: 'UNAUTHORIZED', error: 'Token无效或已过期' });
  }
});

// 连接池指标中间件
app.use(poolMetrics);

// 初始化对象存储服务
const { ObjectStorageService } = require('./objectStorage.js');
const objectStorageService = new ObjectStorageService();

// 文件访问处理函数（同时用于 /uploads 和 /api/uploads）
const handleFileRequest = async (req, res, next) => {
  logger.debug('📥 收到uploads请求:', req.path);
  
  // 关键修复：强制设置跨域响应头（允许前端从后端域名加载图片）
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // 🚀 CDN优化：根据文件类型设置智能缓存策略
  const ext = req.path.split('.').pop().toLowerCase();
  const isMedia = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'mov', 'avi'].includes(ext);
  
  if (isMedia) {
    // 图片和视频：长期缓存（1年），immutable表示内容永不改变
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('CDN-Cache-Control', 'public, max-age=31536000'); // Cloudflare专用
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    
    // 视频流式传输优化
    if (['mp4', 'webm', 'mov'].includes(ext)) {
      res.setHeader('Accept-Ranges', 'bytes'); // 支持Range请求，允许视频拖动
    }
  } else {
    // 其他文件：开发期避免缓存
    res.setHeader('Cache-Control', 'no-store');
  }
  
  // 直接尝试从对象存储获取文件
  // 关键修复：对象存储实际使用 uploads/ 路径（不带斜杠前缀）
  const objectPath = `uploads${req.path}`; // 使用uploads前缀匹配实际存储路径
  try {
    logger.debug('🔄 尝试从对象存储获取:', objectPath);
    const file = await objectStorageService.getObjectFile(objectPath);
    logger.debug('✅ 对象存储找到文件，开始下载');
    await objectStorageService.downloadObject(file, res);
    return; // 成功返回，不继续到下一个中间件
  } catch (error) {
    logger.debug('⚠️ 对象存储中未找到文件:', objectPath, '错误:', error.message);
    // 继续到静态文件处理
  }
  
  // 如果对象存储失败，尝试本地文件
  logger.debug('🔄 回退到本地文件:', req.path);
  next();
};

// 直接处理对象存储访问的静态路由映射 - 优先级高于静态文件
app.use('/uploads', handleFileRequest);
app.use('/api/uploads', handleFileRequest); // API别名，用于前后端分离部署

// 静态文件服务 - 用于提供上传的图片（作为回退）
const uploadsPath = require('path').join(__dirname, 'uploads');
const uploadsStaticConfig = {
  setHeaders: (res, filePath, stat) => {
    // 🚀 CDN优化：根据文件类型设置智能缓存
    const ext = filePath.split('.').pop().toLowerCase();
    const isMedia = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'mov', 'avi'].includes(ext);
    
    if (isMedia) {
      // 图片和视频：长期缓存（1年）
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      res.set('CDN-Cache-Control', 'public, max-age=31536000');
      res.set('Expires', new Date(Date.now() + 31536000000).toUTCString());
      
      // 视频支持Range请求
      if (['mp4', 'webm', 'mov'].includes(ext)) {
        res.set('Accept-Ranges', 'bytes');
      }
    } else {
      res.set('Cache-Control', 'public, max-age=86400'); // 其他文件1天缓存
    }
  }
};
app.use('/uploads', express.static(uploadsPath, uploadsStaticConfig));
app.use('/api/uploads', express.static(uploadsPath, uploadsStaticConfig)); // API别名

// 确保上传目录结构存在
const campaignImagesDir = require('path').join(__dirname, 'uploads', 'campaigns', 'images');
if (!require('fs').existsSync(campaignImagesDir)) {
  require('fs').mkdirSync(campaignImagesDir, { recursive: true });
  logger.debug('✅ 创建campaigns/images上传目录');
}

// 添加直接文件上传端点
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads', 'posts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const objectId = req.headers['x-object-id'] || Date.now().toString();
    cb(null, objectId + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

app.post('/api/storage/upload-direct', upload.single('file'), (req, res) => {
  try {
    logger.debug('收到文件上传请求:', req.file ? req.file.filename : '无文件');
    
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const objectId = path.parse(req.file.filename).name;
    const objectPath = `/objects/posts/${objectId}${path.extname(req.file.filename)}`;

    logger.debug('文件上传成功:', objectPath);

    res.json({
      success: true,
      data: {
        objectPath: objectPath,
        filename: req.file.filename,
        url: `/uploads/posts/${req.file.filename}`
      }
    });
  } catch (error) {
    logger.error('直接上传失败:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

// 通用图片上传端点（用于管理后台）
const uploadMemory = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

app.post('/api/upload', uploadMemory.single('file'), async (req, res) => {
  try {
    logger.debug('📤 收到通用上传请求');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: '没有上传文件' 
      });
    }

    try {
      // 使用对象存储服务
      const objectStorageService = require('./objectStorage.js');
      const uploadResult = await objectStorageService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'rewards/items'
      );

      logger.debug('✅ 图片上传成功:', uploadResult.objectPath);

      res.json({
        success: true,
        url: uploadResult.objectPath,
        data: {
          url: uploadResult.objectPath,
          filename: uploadResult.filename,
          size: req.file.size
        }
      });
    } catch (storageError) {
      logger.warn('⚠️ 对象存储失败，回退到本地存储:', storageError.message);
      
      // 回退方案：本地存储
      const rewardsDir = path.join(__dirname, 'uploads', 'rewards');
      if (!fs.existsSync(rewardsDir)) {
        fs.mkdirSync(rewardsDir, { recursive: true });
      }
      
      const { randomUUID } = require('crypto');
      const filename = `${randomUUID()}${path.extname(req.file.originalname)}`;
      const filepath = path.join(rewardsDir, filename);
      
      fs.writeFileSync(filepath, req.file.buffer);
      
      const fileUrl = `/uploads/rewards/${filename}`;
      logger.debug('✅ 图片回退到本地存储成功:', fileUrl);
      
      res.json({
        success: true,
        url: fileUrl,
        data: { 
          url: fileUrl,
          filename: filename,
          size: req.file.size
        }
      });
    }
  } catch (error) {
    logger.error('❌ 上传图片错误:', error);
    res.status(500).json({ 
      success: false,
      error: '上传失败',
      message: error.message 
    });
  }
});

const distPath = path.join(__dirname, '..', 'client', 'dist');


// >>> public 静态与显式路由优先 >>>
app.use(express.static(path.join(__dirname, "..", "public"), { fallthrough: true }));

// 方案A：/login 路由别名（指向login.html）
app.get("/login", (_req,res)=> res.sendFile(path.join(__dirname, "..", "client", "public", "login.html")));
// <<< end >>>

// Vue应用的静态文件由构建的dist目录提供

// 快速健康检查：用于部署时的根路径检查（不查询数据库，立即返回）
app.get("/", (req, res, next) => {
  // 如果是健康检查请求（没有Accept: text/html），立即返回200
  const acceptHeader = req.headers.accept || '';
  if (!acceptHeader.includes('text/html')) {
    return res.status(200).send('OK');
  }
  // 如果是浏览器请求，继续到Vue应用
  next();
});

// 健康检查：负载均衡只把流量打到"真正可用"的实例
app.get("/api/health", async (req, res) => {
  try {
    // 使用数据库连接池进行简单查询测试
    const { pool } = require('./db')
    await pool.query('SELECT 1')
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, code: e.code, message: e.message });
  }
});


// ========== Cookie调试端点（仅开发环境或通过环境变量启用） ==========
// 用于独立验证Cookie是否能在当前域正常写入和读取
if (ENABLE_DEV_ENDPOINTS || process.env.ENABLE_COOKIE_DEBUG === 'true') {
  logger.warn('🔧 Cookie调试端点已启用');
  
  // 1) 写测试Cookie（不带domain，让浏览器自动绑定当前域）
  app.get('/__cookie/test-set', (req, res) => {
    const testValue = 'DEBUG_' + Date.now();
    res.cookie(COOKIE_NAME, testValue, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      maxAge: 10 * 60 * 1000, // 10分钟
    });
    logger.info('🍪 [DEBUG] 设置测试Cookie:', { name: COOKIE_NAME, value: testValue });
    res.json({ 
      ok: true, 
      hint: 'Set-Cookie已发送',
      cookie: { name: COOKIE_NAME, value: testValue },
      headers: {
        host: req.get('host'),
        origin: req.get('origin'),
        'set-cookie-will-be': `${COOKIE_NAME}=${testValue}; HttpOnly; SameSite=None; Secure; Path=/`
      }
    });
  });

  // 2) 读取浏览器携带的Cookie
  app.get('/__cookie/test-get', (req, res) => {
    logger.info('🍪 [DEBUG] 收到的Cookie:', req.cookies);
    res.json({ 
      ok: true, 
      cookies: req.cookies,
      headers: {
        host: req.get('host'),
        origin: req.get('origin'),
        cookie: req.get('cookie')
      }
    });
  });
}

// API路由
app.use('/api/me', require('./routes/me')); // 用户会话状态接口（必须在最前面）
app.use('/api/auth', require('./routes/auth'));
app.use('/auth/facebook', require('./routes/auth.facebook')); // Facebook IAB 登录
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/db', require('./routes/db'));
app.use('/api/translation', require('./routes/translation'));
app.use('/api/home', require('./routes/home')); // 新增home路由
app.use('/api/points', require('./routes/points')); // 积分系统路由
app.use('/api/rewards', require('./routes/rewards')); // 积分商城路由
app.use('/api/payments', require('./routes/payments')); // Opn Payments (Omise) 支付路由
app.use('/api', require('./routes/analytics'));
app.use('/api', require('./routes/dataDeletion')); // 数据删除业务API
app.use('/api', require('./routes/platformDeletion')); // 平台删除回调端点

// 对象存储访问路由 - 使用 Replit App Storage
// objectStorageService 已在上面初始化

app.get('/objects/*', async (req, res) => {
  try {
    const objectPath = req.path; // /objects/uploads/campaigns/images/xxx.png
    logger.debug('🪣 对象存储访问请求:', objectPath);
    
    const file = await objectStorageService.getObjectFile(objectPath);
    await objectStorageService.downloadObject(file, res);
  } catch (error) {
    logger.error('⚠️ 对象存储访问失败:', error.message);
    if (error instanceof require('./objectStorage.js').ObjectNotFoundError) {
      res.status(404).json({ error: '文件未找到' });
    } else {
      res.status(500).json({ error: '服务器错误' });
    }
  }
})

// 添加所有缺失的API端点 - 在 /api/me 通用路由之前
app.get('/api/me/notifications/unread-count', (req, res) => {
  res.json({ count: 0 }); // 临时返回0
});

app.get('/api/me/notifications/:id', (req, res) => {
  res.json({ id: req.params.id, title: '', body: '', read: false }); // 临时返回空通知
});

app.get('/api/me/notifications', (req, res) => {
  res.json({ items: [], nextPage: null }); // 临时返回空数组
});

app.put('/api/me/notifications/:id/read', (req, res) => {
  res.json({ success: true }); // 临时返回成功
});

app.put('/api/me/notifications/mark-all-read', (req, res) => {
  res.json({ success: true }); // 临时返回成功
});

// 通用通知端点
app.get('/api/notifications/unread-count', (req, res) => {
  res.json({ count: 0 }); // 临时返回0
});

// 临时诊断接口 - 检查对象存储配置状态
app.get('/api/admin/_diag/object-storage', (req,res)=>{
  res.json({
    enabled: true, // Replit App Storage 总是启用的
    provider: 'replit-app-storage',
    privateObjectDir: process.env.PRIVATE_OBJECT_DIR || '/prodee-uploads',
    replitSidecarEndpoint: 'http://127.0.0.1:1106'
  })
});

app.get('/api/notifications/:id', (req, res) => {
  res.json({ id: req.params.id, title: '', body: '', read: false }); // 临时返回空通知
});

app.get('/api/notifications', (req, res) => {
  res.json({ items: [], nextPage: null }); // 临时返回空数组
});

app.put('/api/notifications/:id/read', (req, res) => {
  res.json({ success: true }); // 临时返回成功
});

app.put('/api/notifications/mark-all-read', (req, res) => {
  res.json({ success: true }); // 临时返回成功
});

// 消息端点
app.get('/api/messages', (req, res) => {
  res.json({ items: [], nextPage: null }); // 临时返回空数组
});

app.get('/api/messages/scope', (req, res) => {
  res.json({ items: [], nextPage: null }); // 临时返回空数组
});

// ⚠️ 已移除旧的 /api/me 转发逻辑
// 现在使用专门的 routes/me.js 文件（已在上方注册）
const authRoutes = require('./routes/auth');
// app.use('/api/me', ...)  转发已删除，但保留authRoutes引用供其他地方使用

// 统一首页Feed API已移动到 /routes/home.js

// 活动相关API端点
app.get('/api/campaigns/home', async (req, res) => {
  try {
    const { category = '', province = '', page = 1, limit = 20 } = req.query;
    const { q } = require('./db/query.js');
    
    // 构建查询条件 - 放宽时间限制，只要是active状态且还未过期即可
    let whereClause = "WHERE status = 'active' AND valid_to >= NOW()";
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await q(`
      SELECT id, title, description, 
             title_zh_cn, title_en_us, title_th_th,
             description_zh_cn, description_en_us, description_th_th,
             coupon_type, category, image_url, media_files,
             original_price, discount_price, price_final, face_value, 
             amount_off, min_spend, discount_percent, cap_amount, currency,
             quantity, valid_from, valid_to, status, created_at, updated_at
      FROM coupons 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), offset]);
    
    // 处理媒体文件字段
    const campaigns = result.rows.map(campaign => ({
      ...campaign,
      media_files: typeof campaign.media_files === 'string' ? 
        JSON.parse(campaign.media_files) : campaign.media_files,
      type: 'campaign'
    }));
    
    res.json(campaigns);
  } catch (error) {
    logger.error('获取活动列表失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取活动列表失败',
      message: error.message 
    });
  }
});

app.get('/api/campaigns', async (req, res) => {
  try {
    const { status = 'active', home, featured, category = '', page = 1, limit = 20 } = req.query;
    const { q } = require('./db/query.js');
    
    // 构建查询条件
    let whereClause = `WHERE status = $1`;
    const params = [status];
    let paramIndex = 2;
    
    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    // 如果指定了home或featured，添加时间范围过滤
    if (home || featured) {
      whereClause += ` AND valid_from <= NOW() AND valid_to >= NOW()`;
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await q(`
      SELECT id, title, description, 
             title_zh_cn, title_en_us, title_th_th,
             description_zh_cn, description_en_us, description_th_th,
             coupon_type, category, image_url, media_files,
             original_price, discount_price, price_final, face_value, 
             amount_off, min_spend, discount_percent, cap_amount, currency,
             quantity, valid_from, valid_to, status, created_at, updated_at
      FROM coupons 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), offset]);
    
    // 处理媒体文件字段
    const campaigns = result.rows.map(campaign => ({
      ...campaign,
      media_files: typeof campaign.media_files === 'string' ? 
        JSON.parse(campaign.media_files) : campaign.media_files,
      type: 'campaign'
    }));
    
    res.json(campaigns);
  } catch (error) {
    logger.error('获取活动列表失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取活动列表失败',
      message: error.message 
    });
  }
});

// 领取优惠券API
app.post('/api/coupons/:id/claim', authRoutes.authenticateToken, async (req, res) => {
  try {
    const couponId = parseInt(req.params.id);
    const userId = req.user.id;
    
    logger.debug(`📥 用户${userId}尝试领取优惠券${couponId}`);
    
    const { q } = require('./db/query.js');
    
    // 检查优惠券是否存在
    const couponResult = await q('SELECT * FROM coupons WHERE id = $1', [couponId]);
    if (couponResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '优惠券不存在' });
    }
    
    const coupon = couponResult.rows[0];
    
    // 检查优惠券是否有效
    if (coupon.status !== 'active') {
      return res.status(400).json({ success: false, error: '优惠券已下架' });
    }
    
    // 检查是否还有库存
    if (coupon.quantity <= coupon.claimed_count) {
      return res.status(400).json({ success: false, error: '优惠券已抢完' });
    }
    
    // 检查用户是否已领取
    const existingResult = await q(
      'SELECT id FROM user_coupons WHERE user_id = $1 AND coupon_id = $2',
      [userId, couponId]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ success: false, error: '您已经领取过这张优惠券' });
    }
    
    // 生成6位数字核销码
    const redemptionCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 生成QR码数据（包含用户ID、优惠券ID、核销码）
    const qrData = JSON.stringify({
      userId,
      couponId,
      code: redemptionCode,
      timestamp: Date.now()
    });
    
    // 生成QR码图片（Base64）
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    
    // 创建用户优惠券记录
    const insertResult = await q(
      `INSERT INTO user_coupons 
       (user_id, coupon_id, redemption_code, qr_code_data, status, claimed_at) 
       VALUES ($1, $2, $3, $4, 'unused', NOW()) 
       RETURNING *`,
      [userId, couponId, redemptionCode, qrCodeDataUrl]
    );
    
    // 更新优惠券领取计数
    await q(
      'UPDATE coupons SET claimed_count = claimed_count + 1 WHERE id = $1',
      [couponId]
    );
    
    logger.debug(`✅ 用户${userId}成功领取优惠券${couponId}，核销码：${redemptionCode}`);
    
    res.json({
      success: true,
      data: {
        userCoupon: insertResult.rows[0],
        message: '领取成功'
      }
    });
  } catch (error) {
    logger.error('领取优惠券失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '领取失败，请重试',
      message: error.message 
    });
  }
});

// 增强的全局错误处理中间件
app.use((err, req, res, next) => {
  // 错误日志记录
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  logger.error(`❌ 错误ID: ${errorId}`);
  logger.error('错误详情:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // 数据库相关错误特殊处理
  if (err.code === '57P01') {
    logger.debug('⚠️ 检测到数据库重启错误，已触发自动恢复机制');
    return res.status(503).json({
      success: false,
      error: '数据库服务临时不可用，请稍后重试',
      code: 'DATABASE_RESTARTING',
      errorId
    });
  }

  // 数据库连接错误
  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(err.code)) {
    return res.status(503).json({
      success: false,
      error: '数据库连接失败，请稍后重试',
      code: 'DATABASE_CONNECTION_ERROR',
      errorId
    });
  }

  // JWT认证错误
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: '认证失败，请重新登录',
      code: 'AUTH_ERROR',
      errorId
    });
  }

  // 验证错误（Joi）
  if (err.isJoi || err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: '请求参数错误',
      details: err.details || err.message,
      code: 'VALIDATION_ERROR',
      errorId
    });
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: '文件大小超出限制',
      code: 'FILE_TOO_LARGE',
      errorId
    });
  }

  // LINE SDK错误
  if (err.name === 'HTTPError' && err.originalError) {
    return res.status(500).json({
      success: false,
      error: 'LINE服务调用失败',
      code: 'LINE_API_ERROR',
      errorId
    });
  }

  // 默认服务器错误
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? '服务器内部错误' : err.message,
    message: ENABLE_DEBUG_ERRORS ? err.message : '请稍后重试',
    code: 'INTERNAL_SERVER_ERROR',
    errorId
  });
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  logger.error('🚨 未捕获的异常:', err);
  // 给正在处理的请求一些时间完成
  setTimeout(() => {
    logger.error('💀 应用将退出以防止数据损坏');
    process.exit(1);
  }, 3000);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 未处理的Promise拒绝:', reason);
  logger.error('Promise:', promise);
  
  // 数据库相关的未处理拒绝可能需要重启应用
  if (reason && reason.code === '57P01') {
    logger.debug('⚠️ 数据库相关的未处理拒绝，触发健康检查');
    // 这里可以触发数据库健康检查
  }
});

// 根路径现在由Vue应用处理，通过Vite代理
// 这里不再需要特殊处理

// 提供构建后的前端静态文件（CSS, JS等） - 必须在Vue路由之前！
// 静态文件服务 - 强制no-cache防止浏览器缓存
app.use(express.static(path.join(__dirname, '..', 'client', 'dist'), {
  setHeaders: (res, path) => {
    // 对所有文件设置强制no-cache
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// 前端路由处理 - 对于非API、非静态文件请求返回Vue应用的index.html
app.use('*', (req, res, next) => {
  // 如果是API请求，返回404
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: '接口不存在' });
  }
  
  // 如果是静态资源请求（CSS/JS/图片等），不应该到这里
  // 这些应该已被上面的static中间件处理
  if (req.originalUrl.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    logger.debug('⚠️ 静态资源请求到达通配符路由，文件不存在:', req.originalUrl);
    return res.status(404).send('文件未找到');
  }
  
  // 如果是uploads请求，应该已经被之前的中间件处理了
  if (req.originalUrl.startsWith('/uploads/')) {
    logger.debug('⚠️ uploads请求到达通配符路由，文件可能不存在:', req.originalUrl);
    return res.status(404).json({ error: '文件未找到' });
  }
  
  // 对于其他前端路由，返回Vue应用的index.html
  const indexPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
  
  // 强制no-cache for index.html（防止LINE浏览器缓存）
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      logger.error('发送index.html失败:', err);
      res.status(404).json({ error: '页面不存在' });
    }
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 🔧 自动修复数据库：检查并修复pkce_sessions表的列名
    try {
      const { pool } = require('./storage.js');
      const checkResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'pkce_sessions' AND column_name = 'verifier'
      `);
      
      if (checkResult.rows.length > 0) {
        logger.system('🔧 检测到旧版pkce_sessions表结构，正在自动修复...');
        await pool.query('ALTER TABLE pkce_sessions RENAME COLUMN verifier TO code_verifier');
        logger.system('✅ pkce_sessions表结构已修复');
      }
    } catch (dbFixError) {
      // 如果表不存在或其他错误，忽略（首次部署时表还没创建）
      if (dbFixError.code !== '42P01') { // 42P01 = table does not exist
        logger.debug('数据库修复检查:', dbFixError.message);
      }
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.system(`🚀 ProDee优惠券系统API服务启动成功！`);
      logger.system(`📡 服务地址: http://0.0.0.0:${PORT}`);
      logger.system(`🌍 环境: ${process.env.NODE_ENV || 'production'}`);
      logger.system(`💾 数据库状态: ✅ 已连接`);
      
      // 🔍 打印关键 Channel 配置（脱敏）
      logger.system(`[ENV] LINE_CHANNEL_ID=${(process.env.LINE_CHANNEL_ID||'未配置').slice(0,4)}****`);
      logger.system(`[ENV] LINE_LIFF_CHANNEL_ID=${(process.env.LINE_LIFF_CHANNEL_ID||'未配置').slice(0,4)}****`);
      logger.system(`[ENV] JWT_SECRET=${process.env.JWT_SECRET ? '已配置' : '未配置'}`);
      logger.system(`[ENV] LINE_CHANNEL_SECRET=${process.env.LINE_CHANNEL_SECRET ? '已配置' : '未配置'}`);
      logger.system(`[ENV] NODE_ENV=${process.env.NODE_ENV}`);
      
      logger.info(`🌐 CORS允许的域名: ${JSON.stringify(allowedOrigins)}`);
    });

    // 优雅关机：发布/缩容不再"硬切"连接
    process.on("SIGTERM", () => {
      logger.system("[graceful] SIGTERM received, closing...");
      server.close(async () => {
        try { await pool.end(); } catch {}
        process.exit(0);
      });
    });
    
    // 设置服务器超时
    server.timeout = 10 * 60 * 1000; // 10分钟
    server.keepAliveTimeout = 61 * 1000; // 61秒
    server.headersTimeout = 65 * 1000; // 65秒
  } catch (error) {
    logger.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

// 启动预热：建立连接池，避免刚接流量就冷启动失败
(async function warmup(){
  try { for (let i=0;i<5;i++) await q("SELECT 1"); } catch {}
})();

startServer();