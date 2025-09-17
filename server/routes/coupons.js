const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { authenticateLiff, authenticateLiffWithFollow, optionalLiffAuth } = require('../middleware/liffAuth');

// 生成6位数字核销码
const generateRedemptionCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 计算两点间距离（公里）
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// 获取优惠券列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'active', lat, lng } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 从数据库获取优惠券列表
    const { dbService } = require('../storage.js');
    const coupons = await dbService.getActiveCoupons({
      limit: parseInt(limit),
      offset: offset,
      status: status
    });
    
    // 获取总数用于分页
    const totalCount = await dbService.getCouponsCount(status);
    
    // 为每个优惠券获取关联的门店信息
    const couponsWithStores = await Promise.all(
      coupons.map(async (coupon) => {
        const stores = await dbService.getCouponStores(coupon.id);
        
        // 转换数据格式，处理价格字段的null值
        const formattedCoupon = {
          ...coupon,
          original_price: coupon.original_price ? coupon.original_price.toString() : null,
          discount_price: coupon.discount_price ? coupon.discount_price.toString() : null,
          valid_from: coupon.valid_from.toISOString(),
          valid_to: coupon.valid_to.toISOString(),
          created_at: coupon.created_at.toISOString(),
          updated_at: coupon.updated_at.toISOString(),
          stores: stores
        };
        
        // 为新券类型系统添加价格摘要
        const { enhanceCouponWithPricing } = require('../utils/couponPricing');
        const enhancedCoupon = enhanceCouponWithPricing(formattedCoupon);
        
        // 如果提供了位置信息，计算距离并排序门店
        if (lat && lng && stores.length > 0) {
          enhancedCoupon.stores = stores.map(store => ({
            ...store,
            distance: calculateDistance(parseFloat(lat), parseFloat(lng), parseFloat(store.lat), parseFloat(store.lng))
          })).sort((a, b) => a.distance - b.distance);
        }
        
        return enhancedCoupon;
      })
    );
    
    // 如果提供了位置信息，按最近门店距离排序优惠券
    let sortedCoupons = couponsWithStores;
    if (lat && lng) {
      sortedCoupons = couponsWithStores.filter(coupon => coupon.stores.length > 0)
        .sort((a, b) => a.stores[0].distance - b.stores[0].distance);
    }

    res.json({ 
      success: true,
      data: {
        coupons: sortedCoupons,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: totalCount,
          total_pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取优惠券列表失败',
      message: error.message 
    });
  }
});

// 获取优惠券详情
router.get('/:id', async (req, res) => {
  try {
    const couponId = parseInt(req.params.id);
    const { lat, lng } = req.query;
    
    if (!couponId || isNaN(couponId)) {
      return res.status(400).json({ 
        success: false, 
        error: '无效的优惠券ID' 
      });
    }

    // 从数据库获取优惠券详情
    const { dbService } = require('../storage.js');
    const couponData = await dbService.getCouponById(couponId);
    
    if (!couponData) {
      return res.status(404).json({ 
        success: false, 
        error: '优惠券不存在' 
      });
    }

    // 转换数据格式，处理价格字段的null值
    const formattedCoupon = {
      ...couponData,
      original_price: couponData.original_price ? couponData.original_price.toString() : null,
      discount_price: couponData.discount_price ? couponData.discount_price.toString() : null,
      valid_from: couponData.valid_from.toISOString(),
      valid_to: couponData.valid_to.toISOString(),
      created_at: couponData.created_at.toISOString(),
      updated_at: couponData.updated_at.toISOString()
    };

    // 为新券类型系统添加价格摘要
    const { enhanceCouponWithPricing } = require('../utils/couponPricing');
    const coupon = enhanceCouponWithPricing(formattedCoupon);

    // 获取关联的门店信息
    const stores = await dbService.getCouponStores(couponId);
    
    // 如果提供了位置信息，计算距离并排序
    if (lat && lng && stores.length > 0) {
      coupon.stores = stores.map(store => ({
        ...store,
        distance: calculateDistance(parseFloat(lat), parseFloat(lng), parseFloat(store.lat), parseFloat(store.lng))
      })).sort((a, b) => a.distance - b.distance);
    } else {
      coupon.stores = stores;
    }

    res.json({ 
      success: true,
      data: coupon
    });
  } catch (error) {
    console.error('Get coupon detail error:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取优惠券详情失败',
      message: error.message 
    });
  }
});

// 领取优惠券 (使用LIFF安全认证)
router.post('/:id/claim', authenticateLiffWithFollow, async (req, res) => {
  const { dbService } = require('../storage.js');
  
  try {
    const couponId = parseInt(req.params.id);
    const lineUserId = req.liffUser.userId;
    
    if (!couponId || isNaN(couponId)) {
      return res.status(400).json({ 
        success: false, 
        error: '无效的优惠券ID' 
      });
    }

    console.log(`🎫 开始领取优惠券流程 - 用户: ${lineUserId}, 优惠券: ${couponId}`);

    // 1. 检查优惠券是否存在和有效
    const coupon = await dbService.getCouponById(couponId);
    if (!coupon) {
      return res.status(404).json({ 
        success: false, 
        error: '优惠券不存在' 
      });
    }

    if (coupon.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: '优惠券已下线' 
      });
    }

    // 检查优惠券是否在有效期内
    const now = new Date();
    if (now < new Date(coupon.valid_from) || now > new Date(coupon.valid_to)) {
      return res.status(400).json({ 
        success: false, 
        error: '优惠券不在有效期内' 
      });
    }

    // 2. 检查优惠券库存
    const remainingQuantity = coupon.quantity - coupon.claimed_count;
    if (remainingQuantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: '优惠券已抢完' 
      });
    }

    // 3. 查找或创建用户
    let users = await dbService.getUserByLineId(lineUserId);
    let user = users[0];
    
    if (!user) {
      console.log(`👤 创建新用户: ${lineUserId}`);
      // 创建新用户
      const [newUser] = await dbService.createUser({
        line_id: lineUserId,
        nickname: req.liffUser.name || 'LINE用户',
        avatar: req.liffUser.picture || '',
        is_following: req.liffUser.isFollowing || false,
        language: 'zh-cn'
      });
      user = newUser;
    }

    // 4. 检查用户是否已经领取过这张优惠券
    const existingUserCoupons = await dbService.getUserCoupons(user.id);
    const alreadyClaimed = existingUserCoupons.some(
      (userCoupon) => userCoupon.coupon.id === couponId
    );
    
    if (alreadyClaimed) {
      return res.status(400).json({ 
        success: false, 
        error: '您已经领取过这张优惠券了' 
      });
    }

    // 5. 生成核销码和二维码数据
    const redemptionCode = generateRedemptionCode();
    const expiresAt = new Date(coupon.valid_to);
    
    // 6. 事务性创建用户优惠券记录
    console.log(`📝 创建用户优惠券记录 - 核销码: ${redemptionCode}`);
    const userCouponData = {
      user_id: user.id,
      coupon_id: couponId,
      redemption_code: redemptionCode,
      qr_code_data: JSON.stringify({
        type: 'coupon_redemption',
        redemption_code: redemptionCode,
        coupon_id: couponId,
        user_id: user.id,
        expires_at: expiresAt.toISOString()
      }),
      status: 'claimed',
      expires_at: expiresAt
    };

    const [newUserCoupon] = await dbService.claimCoupon(userCouponData);
    
    // 7. 更新优惠券的已领取数量
    const { eq } = require('drizzle-orm');
    const schema = require('../../shared/schema');
    
    await dbService.database.update(schema.coupons)
      .set({ 
        claimed_count: coupon.claimed_count + 1,
        updated_at: new Date()
      })
      .where(eq(schema.coupons.id, couponId));

    // 8. 生成QR码URL
    const qrCodeUrl = await QRCode.toDataURL(newUserCoupon.qr_code_data);
    
    // 9. 构造响应数据
    const responseData = {
      id: newUserCoupon.id,
      user_id: user.id,
      coupon_id: couponId,
      redemption_code: newUserCoupon.redemption_code,
      qr_code_data: newUserCoupon.qr_code_data,
      qr_code_url: qrCodeUrl,
      status: newUserCoupon.status,
      created_at: newUserCoupon.created_at.toISOString(),
      expires_at: newUserCoupon.expires_at.toISOString(),
      coupon: {
        id: coupon.id,
        title: coupon.title,
        description: coupon.description,
        image_url: coupon.image_url,
        original_price: coupon.original_price.toString(),
        discount_price: coupon.discount_price.toString()
      }
    };

    console.log(`✅ 优惠券领取成功 - 用户优惠券ID: ${newUserCoupon.id}`);

    res.json({ 
      success: true,
      data: responseData,
      message: '优惠券领取成功'
    });
  } catch (error) {
    console.error('❌ 优惠券领取失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '领取优惠券失败',
      message: error.message 
    });
  }
});

// 获取我的优惠券
router.get('/my/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { status = 'all' } = req.query;
    
    // 在实际应用中，这里应该从数据库获取用户优惠券
    // const { dbService } = await import('../storage.js');
    // const userCoupons = await dbService.getUserCoupons(userId);
    
    // 模拟用户优惠券数据
    const mockUserCoupons = [
      {
        id: 1,
        user_id: userId,
        coupon_id: 1,
        redemption_code: '123456',
        qr_code_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        status: 'claimed',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        coupon: {
          id: 1,
          title: '咖啡买一送一',
          description: '购买任意咖啡即可获得同款免费咖啡一杯',
          image_url: 'https://via.placeholder.com/300x200',
          original_price: '68.00',
          discount_price: '34.00'
        }
      },
      {
        id: 2,
        user_id: userId,
        coupon_id: 2,
        redemption_code: '789012',
        qr_code_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        status: 'used',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        redeemed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        coupon: {
          id: 2,
          title: '火锅7折优惠',
          description: '全场火锅享受7折优惠',
          image_url: 'https://via.placeholder.com/300x200',
          original_price: '299.00',
          discount_price: '209.30'
        }
      }
    ];

    // 根据状态筛选
    let filteredCoupons = mockUserCoupons;
    if (status !== 'all') {
      filteredCoupons = mockUserCoupons.filter(coupon => coupon.status === status);
    }

    res.json({ 
      success: true,
      data: {
        coupons: filteredCoupons,
        total: filteredCoupons.length
      }
    });
  } catch (error) {
    console.error('Get my coupons error:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取我的优惠券失败',
      message: error.message 
    });
  }
});

// 核销优惠券
router.post('/redeem', async (req, res) => {
  try {
    const { redemption_code, store_id, verifier_id, notes } = req.body;
    
    if (!redemption_code) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少核销码' 
      });
    }

    if (!store_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少门店ID' 
      });
    }

    // 在实际应用中，这里应该:
    // 1. 验证核销码是否存在和有效
    // 2. 检查优惠券状态
    // 3. 验证门店权限
    // 4. 执行核销操作
    // const { dbService } = await import('../storage.js');
    // const [userCoupon] = await dbService.getUserCouponByRedemptionCode(redemption_code);
    
    // 模拟核销成功
    const redemption = {
      id: Math.floor(Math.random() * 10000),
      user_coupon_id: Math.floor(Math.random() * 10000),
      store_id: parseInt(store_id),
      verifier_id: verifier_id || null,
      verification_method: 'manual',
      redeemed_at: new Date().toISOString(),
      notes: notes || '',
      user_coupon: {
        redemption_code: redemption_code,
        coupon: {
          title: '咖啡买一送一',
          original_price: '68.00',
          discount_price: '34.00'
        },
        user: {
          nickname: '测试用户'
        }
      }
    };

    res.json({ 
      success: true,
      data: redemption,
      message: '优惠券核销成功'
    });
  } catch (error) {
    console.error('Redeem coupon error:', error);
    res.status(500).json({ 
      success: false, 
      error: '核销优惠券失败',
      message: error.message 
    });
  }
});

// 扫码核销优惠券
router.post('/redeem/qr', async (req, res) => {
  try {
    const { qr_code_data, store_id, verifier_id } = req.body;
    
    if (!qr_code_data) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少二维码数据' 
      });
    }

    if (!store_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少门店ID' 
      });
    }

    try {
      const qrData = JSON.parse(qr_code_data);
      
      if (qrData.type !== 'coupon_redemption') {
        return res.status(400).json({ 
          success: false, 
          error: '无效的二维码类型' 
        });
      }

      // 检查二维码是否过期
      if (new Date(qrData.expires_at) < new Date()) {
        return res.status(400).json({ 
          success: false, 
          error: '二维码已过期' 
        });
      }

      // 在实际应用中，这里应该执行核销操作
      const redemption = {
        id: Math.floor(Math.random() * 10000),
        user_coupon_id: qrData.user_coupon_id,
        store_id: parseInt(store_id),
        verifier_id: verifier_id || null,
        verification_method: 'qrcode',
        redeemed_at: new Date().toISOString(),
        user_coupon: {
          redemption_code: qrData.redemption_code,
          coupon: {
            title: '咖啡买一送一',
            original_price: '68.00',
            discount_price: '34.00'
          },
          user: {
            nickname: '测试用户'
          }
        }
      };

      res.json({ 
        success: true,
        data: redemption,
        message: '二维码核销成功'
      });
    } catch (parseError) {
      return res.status(400).json({ 
        success: false, 
        error: '无效的二维码数据' 
      });
    }
  } catch (error) {
    console.error('QR redeem coupon error:', error);
    res.status(500).json({ 
      success: false, 
      error: '二维码核销失败',
      message: error.message 
    });
  }
});

// 优惠券领取API
// 安全的优惠券领取端点 - 使用LIFF认证和关注验证
router.post('/claim', authenticateLiffWithFollow, async (req, res) => {
  try {
    const { coupon_id } = req.body;
    
    if (!coupon_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少优惠券ID' 
      });
    }

    // 从已验证的LIFF用户信息获取用户数据
    const userId = req.liffUser.userId;
    const userProfile = {
      userId: req.liffUser.userId,
      displayName: req.liffUser.name,
      pictureUrl: req.liffUser.picture
    };

    const { dbService } = require('../storage.js');
    
    // 验证优惠券是否存在且可领取
    const coupon = await dbService.getCouponById(coupon_id);
    if (!coupon) {
      return res.status(404).json({ 
        success: false, 
        error: '优惠券不存在' 
      });
    }

    // 检查优惠券状态和剩余数量
    if (coupon.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: '优惠券当前不可领取' 
      });
    }

    const remaining = coupon.quantity - coupon.claimed_count;
    if (remaining <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: '优惠券已被抢完' 
      });
    }

    // 检查是否已过期
    if (new Date(coupon.valid_to) <= new Date()) {
      return res.status(400).json({ 
        success: false, 
        error: '优惠券已过期' 
      });
    }

    // 查找或创建用户
    let users = await dbService.getUserByLineId(req.liffUser.userId);
    let user = users[0];
    
    if (!user) {
      // 创建新用户
      const newUserData = {
        line_id: req.liffUser.userId,
        nickname: req.liffUser.displayName || 'LINE用户',
        avatar: req.liffUser.pictureUrl || '',
        is_following: true, // 假设用户已关注（因为能够领取优惠券）
        language: 'zh-cn'
      };
      
      const [newUser] = await dbService.createUser(newUserData);
      user = newUser;
      console.log('📝 创建新用户:', user.line_id);
    } else {
      // 更新用户关注状态
      await dbService.updateUser(user.id, { 
        is_following: true,
        updated_at: new Date()
      });
      console.log('🔄 更新用户关注状态:', user.line_id);
    }

    // 检查用户是否已经领取过此优惠券
    const existingUserCoupons = await dbService.getUserCoupons(user.id);
    const alreadyClaimed = existingUserCoupons.some(uc => 
      uc.userCoupon.coupon_id === coupon_id
    );
    
    if (alreadyClaimed) {
      return res.status(400).json({ 
        success: false, 
        error: '您已经领取过这张优惠券了' 
      });
    }

    // 生成核销码
    const redemptionCode = generateRedemptionCode();
    const qrCodeUrl = `${req.protocol}://${req.get('host')}/redeem/${redemptionCode}`;
    
    // 创建用户优惠券记录
    const userCouponData = {
      user_id: user.id,
      coupon_id: coupon_id,
      redemption_code: redemptionCode,
      qr_code_url: qrCodeUrl,
      claimed_at: new Date(),
      status: 'claimed'
    };

    const [userCoupon] = await dbService.claimCoupon(userCouponData);
    
    // 更新优惠券已领取数量
    await dbService.updateCoupon(coupon_id, {
      claimed_count: coupon.claimed_count + 1,
      updated_at: new Date()
    });

    console.log(`🎫 用户 ${user.line_id} 成功领取优惠券 ${coupon_id}`);

    res.json({ 
      success: true,
      data: {
        user_coupon: userCoupon,
        redemption_code: redemptionCode,
        qr_code_url: qrCodeUrl,
        message: '优惠券领取成功！'
      }
    });

  } catch (error) {
    console.error('Claim coupon error:', error);
    res.status(500).json({ 
      success: false, 
      error: '领取优惠券失败',
      message: error.message 
    });
  }
});

// 开发专用：测试优惠券领取流程（绕过LIFF验证）
// 使用显式环境变量控制
const ENABLE_DEV_ENDPOINTS = process.env.ENABLE_DEV_ENDPOINTS === 'true';
if (ENABLE_DEV_ENDPOINTS) {
  console.log('🔧 开发端点已启用 - 仅用于开发环境');
  router.post('/:id/dev-claim', async (req, res) => {
    try {
      const coupon_id = parseInt(req.params.id);
      const { user_token } = req.body;

      if (!user_token) {
        return res.status(400).json({ 
          success: false, 
          error: '缺少用户token' 
        });
      }

      // 验证JWT token获取用户信息
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET;
      
      if (!JWT_SECRET) {
        return res.status(500).json({ 
          success: false, 
          error: '服务器配置错误' 
        });
      }
      
      let decoded;
      try {
        decoded = jwt.verify(user_token, JWT_SECRET);
      } catch (jwtError) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token' 
        });
      }

      console.log('🧪 开发模式：测试优惠券领取流程', { coupon_id, user_id: decoded.id });

      const { dbService } = require('../storage.js');
      
      // 验证优惠券是否存在且可领取
      const coupon = await dbService.getCouponById(coupon_id);
      if (!coupon) {
        return res.status(404).json({ 
          success: false, 
          error: '优惠券不存在' 
        });
      }

      if (coupon.status !== 'active') {
        return res.status(400).json({ 
          success: false, 
          error: '优惠券当前不可领取' 
        });
      }

      const remaining = coupon.quantity - coupon.claimed_count;
      if (remaining <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: '优惠券已被抢完' 
        });
      }

      if (new Date(coupon.valid_to) <= new Date()) {
        return res.status(400).json({ 
          success: false, 
          error: '优惠券已过期' 
        });
      }

      // 获取用户信息
      const users = await dbService.getUserByLineId(decoded.line_id);
      let user = users[0];
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: '用户不存在' 
        });
      }

      // 检查是否已经领取过
      const existingUserCoupons = await dbService.getUserCoupons(user.id);
      const alreadyClaimed = existingUserCoupons.some(uc => 
        uc.userCoupon.coupon_id === coupon_id
      );
      
      if (alreadyClaimed) {
        return res.status(400).json({ 
          success: false, 
          error: '您已经领取过这张优惠券了' 
        });
      }

      // 生成核销码
      const redemptionCode = generateRedemptionCode();
      const qrCodeUrl = `${req.protocol}://${req.get('host')}/redeem/${redemptionCode}`;
      
      // 生成QR码数据
      const qrCodeData = JSON.stringify({
        redemption_code: redemptionCode,
        user_coupon_id: null, // 将在创建后更新
        coupon_id: coupon_id,
        user_id: user.id,
        timestamp: new Date().toISOString()
      });
      
      // 创建用户优惠券记录
      const userCouponData = {
        user_id: user.id,
        coupon_id: coupon_id,
        redemption_code: redemptionCode,
        qr_code_data: qrCodeData,
        claimed_at: new Date(),
        status: 'claimed',
        expires_at: coupon.valid_to // 设置过期时间
      };

      const [userCoupon] = await dbService.claimCoupon(userCouponData);
      
      // 更新优惠券已领取数量（原子操作）
      await dbService.incrementCouponClaimedCount(coupon_id);

      console.log(`🎫 开发测试：用户 ${user.line_id} 成功领取优惠券 ${coupon_id}`);

      res.json({ 
        success: true,
        data: {
          user_coupon: userCoupon,
          redemption_code: redemptionCode,
          qr_code_url: qrCodeUrl,
          message: '优惠券领取成功！'
        }
      });

    } catch (error) {
      console.error('Dev claim coupon error:', error);
      res.status(500).json({ 
        success: false, 
        error: '领取优惠券失败',
        message: error.message 
      });
    }
  });
}

module.exports = router;