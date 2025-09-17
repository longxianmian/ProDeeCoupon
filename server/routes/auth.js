const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { pool } = require('../db');
const { dbService } = require('../storage.js');

// JWT密钥（实际应用中应使用环境变量）
// JWT密钥 - 必须使用环境变量，不允许默认值
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  console.error('❌ 致命错误: 未设置JWT_SECRET环境变量');
  console.error('请设置JWT_SECRET环境变量后重启服务器');
  process.exit(1);
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// 验证JWT令牌
const verifyToken = (token) => {
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

// LINE登录初始化
router.get('/line', (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = process.env.LINE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/line/callback`;
    const lineLoginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${process.env.LINE_CHANNEL_ID || 'demo_channel_id'}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid`;
    
    console.log('🔄 LINE登录重定向:', lineLoginUrl);
    
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
});

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
      // 更新现有用户信息
      const updateData = {
        updated_at: new Date()
      };
      if (nickname) updateData.nickname = nickname;
      if (avatar) updateData.avatar = avatar;
      if (language) updateData.language = language;
      
      user = await dbService.updateUser(user.id, updateData);
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
      // 更新现有用户信息
      const updateData = {
        updated_at: new Date()
      };
      if (verificationResult.name && verificationResult.name !== user.nickname) {
        updateData.nickname = verificationResult.name;
      }
      if (verificationResult.picture && verificationResult.picture !== user.avatar) {
        updateData.avatar = verificationResult.picture;
      }
      
      user = await dbService.updateUser(user.id, updateData);
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

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const users = await dbService.getUserByLineId(req.user.line_id);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: '用户不存在' 
      });
    }

    res.json({ 
      success: true,
      data: {
        id: user.id,
        line_id: user.line_id,
        nickname: user.nickname,
        avatar: user.avatar,
        is_following: user.is_following,
        language: user.language,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
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
      language: Joi.string().valid('zh-cn', 'en-us', 'th-th').optional()
    });
    
    const { error: validationError, value } = updateSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({ 
        success: false, 
        error: '输入数据验证失败',
        details: validationError.details.map(d => d.message)
      });
    }
    
    const { nickname, language } = value;
    
    if (!nickname && !language) {
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
    
    const updatedUser = await dbService.updateUser(req.user.id, updateData);

    res.json({ 
      success: true,
      data: {
        id: updatedUser.id,
        line_id: updatedUser.line_id,
        nickname: updatedUser.nickname,
        language: updatedUser.language,
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
    const userId = req.user.id;
    
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
        const qrCodeUrl = item.userCoupon.qr_code_data 
          ? await QRCode.toDataURL(item.userCoupon.qr_code_data)
          : null;

        return {
          userCoupon: {
            id: item.userCoupon.id,
            redemption_code: item.userCoupon.redemption_code,
            status: item.userCoupon.status,
            created_at: item.userCoupon.created_at?.toISOString(),
            redeemed_at: item.userCoupon.redeemed_at?.toISOString(),
            expires_at: item.userCoupon.expires_at?.toISOString(),
            qr_code_url: qrCodeUrl
          },
          coupon: {
            id: item.coupon.id,
            title: item.coupon.title,
            description: item.coupon.description,
            image_url: item.coupon.image_url,
            original_price: item.coupon.original_price?.toString(),
            discount_price: item.coupon.discount_price?.toString(),
            valid_from: item.coupon.valid_from?.toISOString(),
            valid_to: item.coupon.valid_to?.toISOString()
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

// 导出认证中间件
router.authenticateToken = authenticateToken;


module.exports = router;