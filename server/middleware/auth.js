const jwt = require('jsonwebtoken');
const { dbService } = require('../storage.js');

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'prodee_session';

const verifyToken = (token) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET未设置，无法验证token');
  }
  return jwt.verify(token, JWT_SECRET);
};

const authenticateToken = async (req, res, next) => {
  // === 开发环境绕过认证（仅在开发时使用） ===
  // 🔒 安全检查：只有在明确设置了DEV_SKIP_AUTH且在开发域名时才启用
  const isDevDomain = process.env.REPLIT_DEV_DOMAIN && !process.env.REPLIT_DEPLOYMENT_ID;
  if (isDevDomain && process.env.DEV_SKIP_AUTH === '1') {
    req.user = { 
      id: 10, 
      line_id: 'dev-line-id',
      nickname: 'Dev User', 
      role: 'admin' 
    };
    return next();
  }
  // === 开发环境绕过认证结束 ===
  
  // 优先级1: 检查Cookie中的session token（主要认证方式）
  const cookieToken = req.cookies?.[COOKIE_NAME];
  
  if (cookieToken) {
    try {
      const decoded = verifyToken(cookieToken);
      
      // Cookie中的JWT payload包含完整用户信息
      // 重要：同时设置新字段（lineUserId, name）和旧字段（line_id, nickname）以确保向后兼容
      req.user = {
        id: decoded.id,
        // 新字段和旧字段的映射
        line_id: decoded.lineUserId || decoded.line_id,      // 旧字段（兼容现有代码）
        lineUserId: decoded.lineUserId || decoded.line_id,   // 新字段
        nickname: decoded.name || decoded.nickname,          // 旧字段（兼容现有代码）
        name: decoded.name || decoded.nickname,              // 新字段
        avatar: decoded.picture || decoded.avatar,           // 旧字段（兼容现有代码）
        picture: decoded.picture || decoded.avatar,          // 新字段
        role: decoded.role || 'user'
      };
      console.log('✅ [AUTH] Cookie认证成功:', { userId: req.user.id, name: req.user.name });
      return next();
    } catch (error) {
      console.warn('⚠️ [AUTH] Cookie token验证失败:', error.message);
      // Cookie认证失败，继续尝试Authorization header
    }
  }
  
  // 优先级2: 检查Authorization header（向后兼容）
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: '缺少认证token' 
    });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = verifyToken(token);
    
    const users = await dbService.getUserByLineId(decoded.line_id);
    if (!users || users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: '用户不存在' 
      });
    }

    // 统一设置新旧字段，确保与Cookie认证路径一致
    req.user = {
      id: decoded.id,
      // 新字段和旧字段的映射
      line_id: decoded.line_id || decoded.lineUserId,      // 旧字段（兼容现有代码）
      lineUserId: decoded.lineUserId || decoded.line_id,   // 新字段
      nickname: decoded.nickname || decoded.name,          // 旧字段（兼容现有代码）
      name: decoded.name || decoded.nickname,              // 新字段
      avatar: decoded.avatar || decoded.picture,           // 旧字段（兼容现有代码）
      picture: decoded.picture || decoded.avatar,          // 新字段
      role: decoded.role || 'user'
    };
    console.log('✅ [AUTH] Bearer token认证成功:', { userId: req.user.id });
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'token已过期' 
      });
    }
    return res.status(401).json({ 
      success: false, 
      error: '无效的token' 
    });
  }
};

const optionalAuth = async (req, res, next) => {
  // === 开发环境绕过认证（仅在开发时使用） ===
  // 🔒 安全检查：只有在明确设置了DEV_SKIP_AUTH且在开发域名时才启用
  const isDevDomain = process.env.REPLIT_DEV_DOMAIN && !process.env.REPLIT_DEPLOYMENT_ID;
  if (isDevDomain && process.env.DEV_SKIP_AUTH === '1') {
    req.user = { 
      id: 10, 
      line_id: 'dev-line-id',
      nickname: 'Dev User', 
      role: 'admin' 
    };
    return next();
  }
  // === 开发环境绕过认证结束 ===
  
  // 优先级1: 检查Cookie中的session token（主要认证方式）
  const cookieToken = req.cookies?.[COOKIE_NAME];
  
  if (cookieToken) {
    try {
      const decoded = verifyToken(cookieToken);
      
      // Cookie中的JWT payload包含完整用户信息
      // 重要：同时设置新字段（lineUserId, name）和旧字段（line_id, nickname）以确保向后兼容
      req.user = {
        id: decoded.id,
        // 新字段和旧字段的映射
        line_id: decoded.lineUserId || decoded.line_id,      // 旧字段（兼容现有代码）
        lineUserId: decoded.lineUserId || decoded.line_id,   // 新字段
        nickname: decoded.name || decoded.nickname,          // 旧字段（兼容现有代码）
        name: decoded.name || decoded.nickname,              // 新字段
        avatar: decoded.picture || decoded.avatar,           // 旧字段（兼容现有代码）
        picture: decoded.picture || decoded.avatar,          // 新字段
        role: decoded.role || 'user'
      };
      console.log('✅ [AUTH] Cookie认证成功 (optional):', { userId: req.user.id });
      return next();
    } catch (error) {
      console.warn('⚠️ [AUTH] Cookie token验证失败 (optional):', error.message);
      // Cookie认证失败，继续尝试Authorization header
    }
  }
  
  // 优先级2: 检查Authorization header（向后兼容）
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = verifyToken(token);
    
    const users = await dbService.getUserByLineId(decoded.line_id);
    if (!users || users.length === 0) {
      req.user = null;
      return next();
    }

    // 统一设置新旧字段，确保与Cookie认证路径一致
    req.user = {
      id: decoded.id,
      // 新字段和旧字段的映射
      line_id: decoded.line_id || decoded.lineUserId,      // 旧字段（兼容现有代码）
      lineUserId: decoded.lineUserId || decoded.line_id,   // 新字段
      nickname: decoded.nickname || decoded.name,          // 旧字段（兼容现有代码）
      name: decoded.name || decoded.nickname,              // 新字段
      avatar: decoded.avatar || decoded.picture,           // 旧字段（兼容现有代码）
      picture: decoded.picture || decoded.avatar,          // 新字段
      role: decoded.role || 'user'
    };
    console.log('✅ [AUTH] Bearer token认证成功 (optional):', { userId: req.user.id });
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = { verifyToken, authenticateToken, optionalAuth };
