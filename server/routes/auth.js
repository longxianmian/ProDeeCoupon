const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'prodee_session';
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { pool } = require('../db');
const { dbService } = require('../storage.js');
const { pickUserId } = require('../utils/safe');

// JWT密钥（实际应用中应使用环境变量）
// JWT密钥 - 必须使用环境变量，不允许默认值
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  console.warn('⚠️  警告: 未设置JWT_SECRET环境变量，认证功能将被禁用');
  console.warn('请设置JWT_SECRET环境变量以启用完整认证功能');
}

// 输入验证模式
const loginSchema = Joi.object({
  line_id: Joi.string().required(),
  nickname: Joi.string().min(1).max(100).optional(),
  avatar: Joi.string().uri().allow('').optional(),
  language: Joi.string().valid('zh-cn', 'en-us', 'th-th').default('zh-cn').optional()
});

// 生成JWT令牌
const generateToken = (payload) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET未设置，无法生成token');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// 验证JWT令牌
const verifyToken = (token) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET未设置，无法验证token');
  }
  return jwt.verify(token, JWT_SECRET);
};

// 认证中间件
const authenticateToken = async (req, res, next) => {
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
    
    // 验证用户是否仍然存在
    const users = await dbService.getUserByLineId(decoded.line_id);
    if (!users || users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: '用户不存在' 
      });
    }

    req.user = {
      id: decoded.id,
      line_id: decoded.line_id,
      nickname: decoded.nickname,
      role: decoded.role || 'user'
    };
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

// LINE登录初始化（支持/line和/line/login两个路由）
const handleLineLogin = (req, res) => {
  try {
    const userRedirect = req.query.redirect || '/';
    
    // 提取路径（支持完整URL和相对路径）
    let redirectPath = '/';
    try {
      if (userRedirect.match(/^https?:\/\//i)) {
        // 完整URL：提取路径部分
        const url = new URL(userRedirect);
        redirectPath = url.pathname + url.search + url.hash;
      } else if (userRedirect.startsWith('/') && !userRedirect.startsWith('//')) {
        // 相对路径：直接使用（拒绝协议相对URL）
        redirectPath = userRedirect;
      } else {
        // 其他格式（包括//开头）：默认首页
        redirectPath = '/';
      }
    } catch (e) {
      console.warn('⚠️ 无法解析重定向URL:', userRedirect, e.message);
      redirectPath = '/';
    }
    
    // 白名单验证（防止开放重定向攻击）
    const allowedRedirects = ['/', '/my-coupons', '/rewards', '/my', '/coupon/'];
    const isAllowedRedirect = allowedRedirects.some(path => redirectPath.startsWith(path));
    const safeRedirect = isAllowedRedirect ? redirectPath : '/';
    
    if (redirectPath !== '/' && redirectPath !== safeRedirect) {
      console.warn('⚠️ 拒绝可疑的重定向路径:', redirectPath);
    }
    
    // 生成state参数：包含随机字符串和重定向URL（防止cookie在移动浏览器中丢失）
    const stateData = {
      random: crypto.randomBytes(16).toString('hex'),
      redirect: safeRedirect
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    const protocol = (req.get('x-forwarded-proto') === 'https' || req.secure || process.env.NODE_ENV === 'production') ? 'https' : req.protocol;
    const redirectUri = process.env.LINE_REDIRECT_URI || `${protocol}://${req.get('host')}/api/auth/line/callback`;
    const lineLoginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${process.env.LINE_CHANNEL_ID || 'demo_channel_id'}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=profile%20openid`;
    
    console.log('🔑 LINE_CHANNEL_ID:', process.env.LINE_CHANNEL_ID);
    console.log('🔄 LINE登录重定向:', lineLoginUrl);
    console.log('📍 Redirect URI:', redirectUri);
    console.log('🎯 State包含重定向:', safeRedirect);
    
    // 直接重定向到LINE登录页面
    res.redirect(lineLoginUrl);
  } catch (error) {
    console.error('LINE login error:', error);
    res.status(500).json({ 
      success: false, 
      error: '生成登录URL失败',
      message: error.message 
    });
  }
};

router.get('/line', handleLineLogin);
router.get('/line/login', handleLineLogin);

// LINE OAuth GET callback - 处理LINE重定向回来的授权码
router.get('/line/callback', async (req, res) => {
  const axios = require('axios');
  
  try {
    const { code, state, error: oauthError } = req.query;
    
    if (oauthError) {
      console.error('❌ LINE OAuth错误:', oauthError);
      return res.redirect(`/?error=${encodeURIComponent(oauthError)}`);
    }
    
    if (!code) {
      return res.redirect('/?error=missing_code');
    }
    
    // 从state参数中解析重定向URL
    let redirectUrl = '/';
    try {
      const stateData = JSON.parse(Buffer.from(decodeURIComponent(state), 'base64').toString());
      redirectUrl = stateData.redirect || '/';
      console.log('✅ 从state解析重定向URL:', redirectUrl);
    } catch (e) {
      console.warn('⚠️ 无法解析state参数，使用默认重定向:', e.message);
    }
    
    console.log('✅ 收到LINE OAuth授权码:', code.substring(0, 10) + '...');
    
    // 1. 用授权码换取access token
    const tokenUrl = 'https://api.line.me/oauth2/v2.1/token';
    const protocol = (req.get('x-forwarded-proto') === 'https' || req.secure || process.env.NODE_ENV === 'production') ? 'https' : req.protocol;
    const redirectUri = process.env.LINE_REDIRECT_URI || `${protocol}://${req.get('host')}/api/auth/line/callback`;
    
    console.log('📍 Callback Redirect URI:', redirectUri);
    
    const tokenResponse = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: process.env.LINE_CHANNEL_ID,
      client_secret: process.env.LINE_CHANNEL_SECRET
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const { access_token, id_token } = tokenResponse.data;
    console.log('✅ 获取到LINE access token')
    
    // 2. 用access token获取用户信息
    const profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const { userId, displayName, pictureUrl } = profileResponse.data;
    console.log('✅ 获取到LINE用户信息:', displayName)
    
    // 3. 在数据库中查找或创建用户
    let existingUsers = await dbService.getUserByLineId(userId);
    let user = existingUsers[0];
    
    if (!user) {
      const newUserData = {
        line_id: userId,
        nickname: displayName || 'LINE用户',
        avatar: pictureUrl || '',
        is_following: false,
        language: 'zh-cn'
      };
      const [newUser] = await dbService.createUser(newUserData);
      user = newUser;
    } else {
      // 更新用户信息（updateUser返回更新行数，不覆盖user对象）
      await dbService.updateUser(user.id, {
        nickname: displayName || user.nickname,
        avatar: pictureUrl || user.avatar,
        updated_at: new Date()
      });
      // 使用LINE返回的最新信息更新user对象（用于生成token）
      user.nickname = displayName || user.nickname;
      user.avatar = pictureUrl || user.avatar;
    }
    
    // 4. 生成JWT Token
    const tokenPayload = {
      id: user.id,
      line_id: user.line_id,
      nickname: user.nickname,
      role: 'user'
    };
    const jwtToken = generateToken(tokenPayload);
    
    console.log('✅ 生成JWT token，设置Cookie');
    
    // 5. 设置HttpOnly Cookie（更安全，自动携带）
    // ⚠️ 关键：Cookie名称必须与认证中间件一致！
    const cookieName = process.env.SESSION_COOKIE_NAME || 'prodee_session';
    
    // ✅ 不设置domain，让浏览器自动绑定当前host（prodee.replit.app）
    // 这是最稳定的做法，避免domain不匹配导致浏览器拒收Cookie
    res.cookie(cookieName, jwtToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      // domain: 不设置，使用当前域名
      path: '/',
      maxAge: 30 * 24 * 3600 * 1000 // 30天
    });
    
    console.log('🍪 Cookie已设置:', cookieName, '(自动绑定当前域名)');
    
    // 6. 重定向到前端（附加token参数作为备用方案）
    // 优先使用相对路径，保持在同一域名下，确保Cookie可用
    const finalRedirectUrl = `${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(jwtToken)}&login=success`;
    console.log('🔄 重定向到:', finalRedirectUrl);
    res.redirect(finalRedirectUrl);
  } catch (error) {
    console.error('❌ LINE OAuth callback错误:', error.message);
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

// LINE OAuth POST callback - 保留兼容LIFF
router.post('/line/callback', async (req, res) => {
  try {
    const { error: validationError, value } = loginSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({ 
        success: false, 
        error: '输入数据验证失败',
        details: validationError.details.map(d => d.message)
      });
    }

    const { line_id, nickname, avatar, language } = value;
    
    if (!line_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少LINE用户ID' 
      });
    }

    // 在数据库中查找或创建用户
    let existingUsers = await dbService.getUserByLineId(line_id);
    let user = existingUsers[0];
    
    if (!user) {
      // 创建新用户
      const newUserData = {
        line_id,
        nickname: nickname || 'LINE用户',
        avatar: avatar || '',
        is_following: false,
        language: language || 'zh-cn'
      };
      
      const [newUser] = await dbService.createUser(newUserData);
      user = newUser;
    } else {
      // 更新现有用户信息（updateUser返回更新行数，不覆盖user对象）
      const updateData = {
        updated_at: new Date()
      };
      if (nickname) updateData.nickname = nickname;
      if (avatar) updateData.avatar = avatar;
      if (language) updateData.language = language;
      
      await dbService.updateUser(user.id, updateData);
      // 使用传入的最新信息更新user对象（用于生成token）
      if (nickname) user.nickname = nickname;
      if (avatar) user.avatar = avatar;
      if (language) user.language = language;
    }

    // 生成JWT令牌
    const tokenPayload = {
      id: user.id,
      line_id: user.line_id,
      nickname: user.nickname,
      role: 'user'
    };
    
    const token = generateToken(tokenPayload);

    res.json({ 
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          line_id: user.line_id,
          nickname: user.nickname,
          avatar: user.avatar,
          language: user.language,
          is_following: user.is_following
        },
        expires_in: JWT_EXPIRES_IN,
        message: '登录成功'
      }
    });
  } catch (error) {
    console.error('LINE callback error:', error);
    res.status(500).json({ 
      success: false, 
      error: '登录回调处理失败',
      message: error.message 
    });
  }
});

// LIFF ID Token转换为JWT Token的端点
router.post('/liff/exchange-token', async (req, res) => {
  const lineService = require('../services/lineService');
  const { dbService } = require('../storage.js');
  
  try {
    const { id_token } = req.body;
    
    if (!id_token) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少LIFF ID Token' 
      });
    }

    console.log('🔄 开始LIFF ID Token转换JWT流程...');

    // 1. 验证LIFF ID Token
    const verificationResult = await lineService.verifyLiffIdToken(id_token);
    
    if (!verificationResult.success) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid LIFF ID Token',
        message: '无效的LIFF ID Token'
      });
    }

    const lineUserId = verificationResult.userId;
    console.log(`✅ LIFF ID Token验证成功 - 用户: ${lineUserId}`);

    // 2. 查找或创建用户
    let users = await dbService.getUserByLineId(lineUserId);
    let user = users[0];
    
    if (!user) {
      console.log(`👤 创建新用户: ${lineUserId}`);
      // 创建新用户
      const newUserData = {
        line_id: lineUserId,
        nickname: verificationResult.name || 'LINE用户',
        avatar: verificationResult.picture || '',
        is_following: false, // 初始状态，后续通过其他API更新
        language: 'zh-cn'
      };
      
      const [newUser] = await dbService.createUser(newUserData);
      user = newUser;
    } else {
      console.log(`📝 更新现有用户: ${lineUserId}`);
      // 更新现有用户信息（updateUser返回更新行数，不覆盖user对象）
      const updateData = {
        updated_at: new Date()
      };
      if (verificationResult.name && verificationResult.name !== user.nickname) {
        updateData.nickname = verificationResult.name;
      }
      if (verificationResult.picture && verificationResult.picture !== user.avatar) {
        updateData.avatar = verificationResult.picture;
      }
      
      await dbService.updateUser(user.id, updateData);
      // 使用验证结果的最新信息更新user对象（用于生成token）
      if (verificationResult.name) user.nickname = verificationResult.name;
      if (verificationResult.picture) user.avatar = verificationResult.picture;
    }

    // 3. 生成JWT令牌
    const tokenPayload = {
      id: user.id,
      line_id: user.line_id,
      nickname: user.nickname,
      role: 'user'
    };
    
    const jwtToken = generateToken(tokenPayload);
    
    console.log(`🔑 JWT Token生成成功 - 用户ID: ${user.id}`);

    res.json({ 
      success: true,
      data: {
        token: jwtToken,
        user: {
          id: user.id,
          line_id: user.line_id,
          nickname: user.nickname,
          avatar: user.avatar,
          language: user.language,
          is_following: user.is_following
        },
        expires_in: JWT_EXPIRES_IN
      },
      message: 'Token转换成功'
    });
  } catch (error) {
    console.error('❌ LIFF Token转换失败:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Token转换失败',
      message: error.message 
    });
  }
});

// 获取当前用户信息 - 支持Cookie和Authorization头两种认证方式
router.get('/me', async (req, res) => {
  try {
    // 优先使用Cookie认证，其次使用Authorization头
    const cookieToken = req.cookies?.[COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    const token = cookieToken || bearerToken;
    
    console.log('🔍 [/api/me] 认证检查:', {
      hasCookie: !!cookieToken,
      hasBearer: !!bearerToken,
      selectedToken: token ? 'Cookie或Bearer' : '无'
    });
    
    // 如果没有任何认证凭据，返回匿名用户信息
    if (!token) {
      return res.json({
        success: true,
        data: {
          id: null,
          line_id: null,
          nickname: 'เยี่ยมชม', // 泰语：访客
          language: 'th-th',
          avatar: '',
          is_following: false,
          points: 0,
          level: 1,
          province: 'bangkok',
          isAuthenticated: false
        }
      });
    }

    // 如果有token，尝试验证用户
    
    try {
      const decoded = verifyToken(token);
      
      // 验证用户是否仍然存在
      const users = await dbService.getUserByLineId(decoded.line_id);
      const user = users[0];
      
      if (!user) {
        // 如果token有效但用户不存在，返回匿名信息
        return res.json({
          success: true,
          data: {
            id: null,
            line_id: null,
            nickname: 'เยี่ยมชม',
            language: 'th-th',
            avatar: '',
            is_following: false,
            points: 0,
            level: 1,
            province: 'bangkok',
            isAuthenticated: false
          }
        });
      }

      // 查询员工绑定信息
      const { q } = require('../db');
      const staffBindingResult = await q(`
        SELECT 
          sb.id as binding_id,
          sb.binding_status,
          sp.staff_id,
          sp.name as staff_name,
          sp.store_id,
          s.name as store_name,
          s.code as store_code
        FROM staff_bindings sb
        JOIN staff_presets sp ON sb.preset_id = sp.id
        JOIN stores s ON sp.store_id = s.id
        WHERE sb.line_user_id = $1 AND sb.binding_status = 'bound'
        LIMIT 1
      `, [user.line_id]);

      const staffBinding = staffBindingResult.rows[0];
      const isStaff = !!staffBinding;

      // 返回认证用户信息（包含员工信息）
      res.json({
        success: true,
        data: {
          id: user.id,
          line_id: user.line_id,
          nickname: user.nickname,
          avatar: user.avatar,
          is_following: user.is_following,
          language: user.language,
          points: user.points || 0,
          level: user.level || 1,
          province: user.province || 'bangkok',
          created_at: user.created_at,
          updated_at: user.updated_at,
          isAuthenticated: true,
          // 员工信息
          isStaff: isStaff,
          storeId: staffBinding?.store_id || null,
          store_id: staffBinding?.store_id || null,  // 兼容旧版
          storeName: staffBinding?.store_name || null,
          storeCode: staffBinding?.store_code || null,
          staffId: staffBinding?.staff_id || null,
          staffName: staffBinding?.staff_name || null
        }
      });
    } catch (tokenError) {
      // Token无效，返回匿名用户信息
      res.json({
        success: true,
        data: {
          id: null,
          line_id: null,
          nickname: 'เยี่ยมชม',
          language: 'th-th',
          avatar: '',
          is_following: false,
          points: 0,
          level: 1,
          province: 'bangkok',
          isAuthenticated: false
        }
      });
    }
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败',
      message: error.message
    });
  }
});

// 更新用户信息
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const updateSchema = Joi.object({
      nickname: Joi.string().min(1).max(100).optional(),
      language: Joi.string().valid('zh-cn', 'en-us', 'th-th').optional(),
      avatar: Joi.string().uri().allow('').optional(),
      province: Joi.string().min(1).max(50).optional()
    });
    
    const { error: validationError, value } = updateSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({ 
        success: false, 
        error: '输入数据验证失败',
        details: validationError.details.map(d => d.message)
      });
    }
    
    const { nickname, language, avatar, province } = value;
    
    if (!nickname && !language && !avatar && !province) {
      return res.status(400).json({ 
        success: false, 
        error: '没有提供要更新的字段' 
      });
    }
    
    const updateData = {
      updated_at: new Date()
    };
    
    if (nickname) updateData.nickname = nickname;
    if (language) updateData.language = language;
    if (avatar) updateData.avatar = avatar;
    if (province) updateData.province = province;
    
    const userId = pickUserId(req, res);
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }
    
    const updatedUser = await dbService.updateUser(userId, updateData);

    res.json({ 
      success: true,
      data: {
        id: updatedUser.id,
        line_id: updatedUser.line_id,
        nickname: updatedUser.nickname,
        avatar: updatedUser.avatar,
        language: updatedUser.language,
        province: updatedUser.province,
        points: updatedUser.points,
        level: updatedUser.level,
        updated_at: updatedUser.updated_at
      },
      message: '用户信息更新成功'
    });
  } catch (error) {
    console.error('Update user info error:', error);
    res.status(500).json({ 
      success: false, 
      error: '更新用户信息失败',
      message: error.message 
    });
  }
});

// 获取用户优惠券列表
router.get('/me/coupons', authenticateToken, async (req, res) => {
  const { dbService } = require('../storage.js');
  
  try {
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }
    
    console.log(`📋 获取用户优惠券列表 - 用户ID: ${userId}, 状态筛选: ${status}`);

    // 获取用户的所有优惠券
    const userCouponsData = await dbService.getUserCoupons(userId);
    
    if (!userCouponsData || userCouponsData.length === 0) {
      return res.json({ 
        success: true,
        data: {
          coupons: [],
          pagination: {
            current_page: parseInt(page),
            per_page: parseInt(limit),
            total: 0,
            total_pages: 0
          }
        },
        message: '暂无优惠券记录'
      });
    }

    // 格式化数据并添加QR码URL
    const QRCode = require('qrcode');
    const formattedCoupons = await Promise.all(
      userCouponsData.map(async (item) => {
        const qrCodeUrl = item.user_coupons.qr_code_data 
          ? await QRCode.toDataURL(item.user_coupons.qr_code_data)
          : null;

        return {
          userCoupon: {
            id: item.user_coupons.id,
            redemption_code: item.user_coupons.redemption_code,
            status: item.user_coupons.status,
            created_at: item.user_coupons.created_at?.toISOString(),
            redeemed_at: item.user_coupons.redeemed_at?.toISOString(),
            expires_at: item.user_coupons.expires_at?.toISOString(),
            qr_code_url: qrCodeUrl
          },
          coupon: {
            id: item.coupons.id,
            title: item.coupons.title,
            title_zh_cn: item.coupons.title_zh_cn,
            title_en_us: item.coupons.title_en_us,
            title_th_th: item.coupons.title_th_th,
            description: item.coupons.description,
            description_zh_cn: item.coupons.description_zh_cn,
            description_en_us: item.coupons.description_en_us,
            description_th_th: item.coupons.description_th_th,
            image_url: item.coupons.image_url,
            original_price: item.coupons.original_price?.toString(),
            discount_price: item.coupons.discount_price?.toString(),
            price_final: item.coupons.price_final?.toString(),
            currency: item.coupons.currency,
            coupon_type: item.coupons.coupon_type,
            valid_from: item.coupons.valid_from?.toISOString(),
            valid_to: item.coupons.valid_to?.toISOString(),
            rules: item.coupons.rules
          }
        };
      })
    );

    // 根据状态筛选
    let filteredCoupons = formattedCoupons;
    if (status !== 'all') {
      filteredCoupons = formattedCoupons.filter(item => 
        item.userCoupon.status === status
      );
    }

    // 分页处理
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedCoupons = filteredCoupons.slice(startIndex, endIndex);

    console.log(`✅ 成功获取用户优惠券 - 总数: ${filteredCoupons.length}, 当前页: ${paginatedCoupons.length}`);

    res.json({ 
      success: true,
      data: {
        coupons: paginatedCoupons,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: filteredCoupons.length,
          total_pages: Math.ceil(filteredCoupons.length / limit)
        }
      },
      message: '获取用户优惠券成功'
    });
  } catch (error) {
    console.error('❌ 获取用户优惠券失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取用户优惠券失败',
      message: error.message 
    });
  }
});

// 获取单个用户优惠券详情（用于核销页面）
router.get('/me/coupons/:userCouponId', authenticateToken, async (req, res) => {
  const { dbService } = require('../storage.js');
  
  try {
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }
    
    const userCouponId = req.params.userCouponId;
    
    console.log(`📋 获取用户优惠券详情 - 用户ID: ${userId}, 优惠券ID: ${userCouponId}`);

    // 获取单个用户优惠券详情
    const userCouponData = await dbService.getUserCouponById(userCouponId, userId);
    
    if (!userCouponData) {
      return res.status(404).json({ 
        success: false,
        error: '用户优惠券不存在或无权限访问'
      });
    }

    // 生成QR码数据
    const qrCodeData = JSON.stringify({
      type: 'coupon_redemption',
      user_coupon_id: userCouponData.user_coupons.id,
      redemption_code: userCouponData.user_coupons.redemption_code,
      coupon_id: userCouponData.coupons.id,
      expires_at: userCouponData.user_coupons.expires_at,
      timestamp: new Date().toISOString()
    });

    // 获取优惠券关联的门店信息
    const storesData = await dbService.getCouponStores(userCouponData.coupons.id);

    // 格式化返回数据
    const formattedData = {
      id: userCouponData.user_coupons.id,
      coupon_id: userCouponData.coupons.id,
      redemption_code: userCouponData.user_coupons.redemption_code,
      status: userCouponData.user_coupons.status,
      created_at: userCouponData.user_coupons.created_at?.toISOString(),
      expires_at: userCouponData.user_coupons.expires_at?.toISOString(),
      redeemed_at: userCouponData.user_coupons.redeemed_at?.toISOString(),
      qr_code_data: qrCodeData,
      coupon: {
        id: userCouponData.coupons.id,
        title: userCouponData.coupons.title,
        title_zh_cn: userCouponData.coupons.title_zh_cn,
        title_en_us: userCouponData.coupons.title_en_us,
        title_th_th: userCouponData.coupons.title_th_th,
        description: userCouponData.coupons.description,
        description_zh_cn: userCouponData.coupons.description_zh_cn,
        description_en_us: userCouponData.coupons.description_en_us,
        description_th_th: userCouponData.coupons.description_th_th,
        image_url: userCouponData.coupons.image_url,
        original_price: userCouponData.coupons.original_price?.toString(),
        discount_price: userCouponData.coupons.discount_price?.toString(),
        price_final: userCouponData.coupons.price_final?.toString(),
        currency: userCouponData.coupons.currency || 'THB',
        coupon_type: userCouponData.coupons.coupon_type || 'final_price',
        valid_from: userCouponData.coupons.valid_from?.toISOString(),
        valid_to: userCouponData.coupons.valid_to?.toISOString(),
        rules: userCouponData.coupons.rules,
        stores: storesData || []
      }
    };

    console.log(`✅ 成功获取用户优惠券详情 - ID: ${userCouponId}`);

    res.json({ 
      success: true,
      data: formattedData,
      message: '获取用户优惠券详情成功'
    });
  } catch (error) {
    console.error('❌ 获取用户优惠券详情失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取用户优惠券详情失败',
      message: error.message 
    });
  }
});

// 退出登录
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // 在实际应用中，这里可能需要将token加入黑名单
    res.json({ 
      success: true,
      message: '退出登录成功'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: '退出登录失败',
      message: error.message 
    });
  }
});

// 测试登录路由（仅用于开发测试）
router.post('/test-login', async (req, res) => {
  // 生产环境安全检查（Replit环境除外）
  if (process.env.NODE_ENV === 'production' && !process.env.REPL_ID) {
    return res.status(404).json({
      success: false,
      error: '测试端点在生产环境不可用'
    });
  }
  try {
    const testLineId = `test_${crypto.randomBytes(8).toString('hex')}`;
    const testUserData = {
      line_id: testLineId,
      nickname: '测试用户',
      avatar: '',
      is_following: false,
      language: 'zh-cn'
    };
    
    const [testUser] = await dbService.createUser(testUserData);
    
    const tokenPayload = {
      id: testUser.id,
      line_id: testUser.line_id,
      nickname: testUser.nickname,
      role: 'user'
    };
    
    const token = generateToken(tokenPayload);
    
    res.json({ 
      success: true,
      data: {
        token,
        user: {
          id: testUser.id,
          line_id: testUser.line_id,
          nickname: testUser.nickname,
          avatar: testUser.avatar,
          language: testUser.language,
          is_following: testUser.is_following
        },
        expires_in: JWT_EXPIRES_IN,
        message: '测试登录成功'
      }
    });
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ 
      success: false, 
      error: '测试登录失败',
      message: error.message 
    });
  }
});

// 获取用户通知消息
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    // 模拟通知数据，实际应用中应该从数据库获取
    const mockNotifications = [
      {
        id: 1,
        title: '优惠券即将过期',
        content: '您有3张优惠券将在3天后过期，请及时使用',
        type: 'warning',
        read: false,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        title: '新优惠券已到账',
        content: '您成功领取了"星巴克买一送一"优惠券',
        type: 'success',
        read: false,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        title: '系统通知',
        content: '系统将于今晚23:00-01:00进行维护，期间可能无法正常使用',
        type: 'info',
        read: true,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json({
      success: true,
      data: {
        notifications: mockNotifications,
        unread_count: mockNotifications.filter(n => !n.read).length
      }
    });
  } catch (error) {
    console.error('获取通知失败:', error);
    res.status(500).json({
      success: false,
      error: '获取通知失败'
    });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
// === LINE id_token -> session exchange (POST /api/auth/line/exchange) ===
// body: { id_token: string } -> verify by LINE, then set HttpOnly cookie(sid)
router.post('/line/exchange', async (req, res) => {
  try {
    const { id_token } = req.body || {};
    if (!id_token) return res.status(400).json({ code: 400, msg: 'missing id_token' });

    // verify id_token with LINE
    const verifyResp = await require('axios').post(
      'https://api.line.me/oauth2/v2.1/verify',
      new URLSearchParams({
        id_token,
        client_id: process.env.LINE_CHANNEL_ID, // <-- 必须配置为你的 Channel ID
      }).toString(),
      { headers: { 'content-type': 'application/x-www-form-urlencoded' } }
    );

    const v = verifyResp.data; // { sub, name?, picture?, ... }
    if (!v || !v.sub) return res.status(401).json({ code: 401, msg: 'invalid id_token' });

    // sign our own session token
    const payload = {
      id: String(v.sub),
      line_id: v.sub,
      nickname: v.name || '',
      avatar: v.picture || '',
    };
    const token = require('jsonwebtoken').sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // set sid cookie for your site
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    return res.json({ ok: true, user: payload });
  } catch (err) {
    const status = (err.response && err.response.status) || 500;
    const data = (err.response && err.response.data) || { msg: err.message };
    return res.status(status).json({ code: status, error: data });
  }
});

// 若本文件是作为模块被 index.js 用 `app.use(require('./routes/auth'))` 挂载，确保导出 router
if (!module.exports || module.exports === exports) {
  module.exports = router;
}

// --- debug ping to verify mount ---
router.get('/__ping', (req, res) => res.json({ ok: true, where: 'auth.js router' }));
