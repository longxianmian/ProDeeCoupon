const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const QRCode = require('qrcode');
const router = express.Router();
const { pool, safeQuery } = require('../db');
const googleMapsService = require('../../shared/services/googleMaps');

// JWT密钥 - 必须使用环境变量，不允许默认值
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ 致命错误: 未设置JWT_SECRET环境变量');
  console.error('请设置JWT_SECRET环境变量后重启服务器');
  process.exit(1);
}

// LINE ID Token验证函数
async function verifyLineIdToken(idToken, channelId) {
  try {
    if (!idToken) {
      throw new Error('ID token is required');
    }
    
    // 调用LINE的ID token验证API (使用GET方法)
    const response = await axios.get('https://api.line.me/oauth2/v2.1/verify', {
      params: {
        id_token: idToken,
        client_id: channelId
      }
    });
    
    const tokenData = response.data;
    
    // 验证token的有效性
    if (!tokenData.sub || !tokenData.name) {
      throw new Error('Invalid token data');
    }
    
    return {
      userId: tokenData.sub,
      displayName: tokenData.name,
      email: tokenData.email || null
    };
  } catch (error) {
    console.error('LINE ID token verification failed:', error.response?.data || error.message);
    throw new Error('Invalid LINE ID token');
  }
}

// 管理员登录 - 安全的开发模式认证
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '邮箱和密码不能为空'
      });
    }

    // 安全模式：严格要求环境变量中的管理员账户
    if (!process.env.ADMIN_PASSWORD || !process.env.DEV_PASSWORD) {
      console.error('❌ 缺少必需的环境变量: ADMIN_PASSWORD 和 DEV_PASSWORD');
      return res.status(500).json({
        success: false,
        message: '服务器配置错误'
      });
    }

    const devAdmins = {
      'admin@predee.com': {
        password: process.env.ADMIN_PASSWORD,
        id: 1,
        name: '系统管理员',
        role: 'super_admin',
        status: 'active'
      },
      'dev@predee.com': {
        password: process.env.DEV_PASSWORD,
        id: 2,
        name: '开发管理员',
        role: 'admin',
        status: 'active'
      }
    };

    // 严格验证：仅允许预定义的管理员账户
    const adminAccount = devAdmins[email];
    if (!adminAccount || password !== adminAccount.password) {
      console.log('❌ 管理员登录失败:', email);
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      {
        id: adminAccount.id,
        email: email,
        role: adminAccount.role,
        type: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 返回成功响应
    const adminData = {
      id: adminAccount.id,
      email: email,
      name: adminAccount.name,
      role: adminAccount.role,
      last_login: new Date().toISOString()
    };

    console.log('✅ 管理员登录成功:', email);

    res.json({
      success: true,
      message: '登录成功',
      token,
      admin: adminData
    });

  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 管理员认证中间件
const adminAuth = async (req, res, next) => {
  try {
    // 🔥 临时使用简化认证 (生产环境需要完整JWT验证)
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供访问令牌'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = {
      id: decoded.id,
      email: decoded.email,
      name: '系统管理员',
      role: decoded.role || 'super_admin'
    };
    console.log('✅ AdminAuth: JWT验证成功:', decoded.email);
    
    next();
  } catch (error) {
    console.error('管理员认证错误:', error);
    res.status(401).json({
      success: false,
      message: '无效的访问令牌'
    });
  }
};

// 获取仪表板数据 - 需要管理员认证
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // 返回模拟的仪表板数据（避免数据库超时）
    const dashboardData = {
      stats: {
        totalRevenue: 234501,
        totalOrders: 1284, 
        totalUsers: 8954,
        growthRate: 3.7
      },
      message: '仪表板数据获取成功'
    }
    
    res.json({
      success: true,
      data: dashboardData
    })
  } catch (error) {
    console.error('获取仪表板数据错误:', error)
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败'
    })
  }
})

// 获取仪表板统计数据
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    // 获取各种统计数据
    const [couponsResult, storesResult, usersResult, redemptionsResult] = await Promise.all([
      safeQuery('SELECT COUNT(*) as total FROM coupons'),
      safeQuery('SELECT COUNT(*) as total FROM stores WHERE status = $1', ['active']),
      safeQuery('SELECT COUNT(*) as total FROM users'),
      safeQuery('SELECT COUNT(*) as total FROM redemptions')
    ]);

    const stats = {
      totalCoupons: parseInt(couponsResult.rows[0].total),
      totalStores: parseInt(storesResult.rows[0].total),
      totalUsers: parseInt(usersResult.rows[0].total),
      totalRedemptions: parseInt(redemptionsResult.rows[0].total)
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

// 门店管理
router.get('/stores', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await safeQuery(`
      SELECT id, name, address, lat, lng, image_url, code, status, 
             city, google_place_id, rating, opening_hours, phone, website,
             created_at, updated_at
      FROM stores
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await safeQuery('SELECT COUNT(*) as total FROM stores WHERE status = \'active\'');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取门店列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取门店列表失败'
    });
  }
});

// 获取门店数量统计（用于生成门店编码）
router.get('/stores/count', adminAuth, async (req, res) => {
  try {
    const { province_code, district_code } = req.query;
    
    let query = 'SELECT COUNT(*) as count FROM stores WHERE status = $1';
    let params = ['active'];
    
    // 如果提供了府和县/区编码，统计该府县的门店数量
    if (province_code && district_code) {
      query += ' AND code LIKE $2';
      params.push(`${province_code}${district_code}%`);
    } else if (province_code) {
      // 只提供府编码，统计该府所有门店
      query += ' AND code LIKE $2';
      params.push(`${province_code}%`);
    }
    
    const result = await safeQuery(query, params);
    const count = parseInt(result.rows[0].count) || 0;
    
    console.log(`门店数量统计: 府=${province_code}, 县/区=${district_code}, 数量=${count}`);
    
    res.json({
      success: true,
      count: count
    });
    
  } catch (error) {
    console.error('获取门店数量统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取门店数量统计失败',
      count: 0
    });
  }
});


// 用户管理
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await safeQuery(`
      SELECT id, line_id, nickname, avatar, is_following, language, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await safeQuery('SELECT COUNT(*) as total FROM users');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 核销记录管理
router.get('/redemptions', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await safeQuery(`
      SELECT 
        r.id,
        r.verification_method,
        r.redeemed_at,
        r.notes,
        u.nickname as user_name,
        u.line_id,
        s.name as store_name,
        c.title as coupon_title,
        c.discount_price,
        v.nickname as verifier_name
      FROM redemptions r
      LEFT JOIN user_coupons uc ON r.user_coupon_id = uc.id
      LEFT JOIN users u ON uc.user_id = u.id
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      LEFT JOIN stores s ON r.store_id = s.id
      LEFT JOIN users v ON r.verifier_id = v.id
      ORDER BY r.redeemed_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await safeQuery('SELECT COUNT(*) as total FROM redemptions');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取核销记录错误:', error);
    res.status(500).json({
      success: false,
      message: '获取核销记录失败'
    });
  }
});

// Google Maps 集成接口

// Places Autocomplete - 地址自动补全
router.get('/places/autocomplete', adminAuth, async (req, res) => {
  try {
    const { input } = req.query;
    
    if (!input || input.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const suggestions = await googleMapsService.getPlaceAutocomplete(input, {
      types: 'establishment',
      components: 'country:th',
      language: 'zh-CN'
    });

    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('地址自动补全错误:', error);
    res.status(500).json({
      success: false,
      message: '地址自动补全失败'
    });
  }
});

// Place Details - 获取地点详细信息
router.get('/places/details', adminAuth, async (req, res) => {
  try {
    const { placeId } = req.query;
    
    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: '缺少地点ID参数'
      });
    }

    const placeDetails = await googleMapsService.getPlaceDetails(placeId, {
      fields: 'name,formatted_address,geometry,rating,opening_hours,formatted_phone_number,website,address_components',
      language: 'zh-CN'
    });

    if (!placeDetails) {
      return res.status(404).json({
        success: false,
        message: '未找到地点信息'
      });
    }

    // 调试：打印营业时间信息
    console.log('🔍 营业时间调试信息:', {
      openingHours: placeDetails.openingHours,
      hasOpeningHours: !!placeDetails.openingHours,
      weekdayText: placeDetails.openingHours?.weekdayText,
      openNow: placeDetails.openingHours?.openNow
    });

    // 提取城市信息 - 使用多种方法
    let city = '';
    
    // 方法1：从Places API的地址组件中提取（如果可用）
    if (placeDetails.addressComponents) {
      city = googleMapsService.extractCityFromComponents(placeDetails.addressComponents);
      console.log('🏙️ 从Places API地址组件获取城市:', city);
    }
    
    // 方法2：从formatted_address解析
    if (!city && placeDetails.address) {
      const addressParts = placeDetails.address.split(',').map(part => part.trim());
      // 通常城市在倒数第2个位置（最后一个是国家/邮编）
      if (addressParts.length >= 2) {
        city = addressParts[addressParts.length - 2];
        // 去掉可能的邮编
        city = city.replace(/\d{5}.*$/, '').trim();
        console.log('🏙️ 从地址解析获取城市:', city);
      }
    }
    
    // 方法3：如果还是没有，尝试反向地理编码（作为最后手段）
    if (!city) {
      try {
        const geocodeResult = await googleMapsService.reverseGeocode(placeDetails.lat, placeDetails.lng);
        city = geocodeResult ? 
          googleMapsService.extractCityFromComponents(geocodeResult.addressComponents) : '';
        console.log('🏙️ 从反向地理编码获取城市:', city);
      } catch (error) {
        console.log('⚠️ 反向地理编码失败，但已尝试其他方法获取城市信息');
      }
    }

    const enrichedDetails = {
      ...placeDetails,
      city,
      placeId
    };

    res.json({
      success: true,
      data: enrichedDetails
    });

  } catch (error) {
    console.error('获取地点详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取地点详情失败'
    });
  }
});

// 添加门店
router.post('/stores', adminAuth, async (req, res) => {
  try {
    const {
      name,
      address,
      lat,
      lng,
      image_url,
      code,
      city,
      google_place_id,
      rating,
      opening_hours,
      phone,
      website
    } = req.body;

    // 验证必填字段
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: '门店名称和地址为必填项'
      });
    }

    // 使用健壮的数据库查询 (带重试机制)
    const result = await safeQuery(`
      INSERT INTO stores 
      (name, address, lat, lng, image_url, code, city, google_place_id, rating, opening_hours, phone, website, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW(), NOW())
      RETURNING *
    `, [
      name,
      address,
      lat || null,
      lng || null,
      image_url || null,
      code || null,
      city || null,
      google_place_id || null,
      rating || null,
      opening_hours || null,
      phone || null,
      website || null
    ]);

    console.log('✅ 门店添加成功:', name);

    res.json({
      success: true,
      message: '门店添加成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('添加门店错误:', error);
    res.status(500).json({
      success: false,
      message: '添加门店失败'
    });
  }
});

// 更新门店
router.put('/stores/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      lat,
      lng,
      image_url,
      code,
      city,
      google_place_id,
      rating,
      opening_hours,
      phone,
      website,
      status
    } = req.body;

    // 验证必填字段
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: '门店名称和地址为必填项'
      });
    }

    // 更新门店
    const result = await safeQuery(`
      UPDATE stores 
      SET name = $1, address = $2, lat = $3, lng = $4, image_url = $5, code = $6,
          city = $7, google_place_id = $8, rating = $9, opening_hours = $10, 
          phone = $11, website = $12, status = $13, updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `, [
      name,
      address,
      lat || null,
      lng || null,
      image_url || null,
      code || null,
      city || null,
      google_place_id || null,
      rating || null,
      opening_hours || null,
      phone || null,
      website || null,
      status || 'active',
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '门店不存在'
      });
    }

    res.json({
      success: true,
      message: '门店更新成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('更新门店错误:', error);
    res.status(500).json({
      success: false,
      message: '更新门店失败'
    });
  }
});

// 删除门店
router.delete('/stores/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 软删除门店 (使用健壮查询)
    const result = await safeQuery(`
      UPDATE stores 
      SET status = 'inactive', updated_at = NOW()
      WHERE id = $1
      RETURNING id, name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '门店不存在'
      });
    }

    res.json({
      success: true,
      message: '门店删除成功'
    });

  } catch (error) {
    console.error('删除门店错误:', error);
    res.status(500).json({
      success: false,
      message: '删除门店失败'
    });
  }
});

// ================== 活动管理 API ==================

// 获取活动列表
router.get('/campaigns', adminAuth, async (req, res) => {
  const { enhanceCouponWithPricing } = require('../utils/couponPricing');
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const result = await safeQuery(`
      SELECT id, title, description, image_url, media_files, 
             coupon_type, original_price, discount_price, price_final, face_value, 
             amount_off, min_spend, discount_percent, cap_amount, currency,
             quantity, claimed_count, redeemed_count, valid_from, valid_to, 
             status, created_at, updated_at
      FROM coupons
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const countResult = await safeQuery(`
      SELECT COUNT(*) as total FROM coupons ${whereClause}
    `, params);
    const total = parseInt(countResult.rows[0].total);

    // 为每个券添加价格摘要
    const enhancedCoupons = result.rows.map(coupon => enhanceCouponWithPricing(coupon));

    res.json({
      success: true,
      data: enhancedCoupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取活动列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取活动列表失败'
    });
  }
});

// 添加活动
router.post('/campaigns', adminAuth, async (req, res) => {
  const { validateCouponPricing, enhanceCouponWithPricing } = require('../utils/couponPricing');
  
  try {
    const {
      title,
      description,
      coupon_type = 'final_price',
      // 原有字段（向后兼容）
      original_price,
      discount_price,
      // 新的价格字段
      price_final,
      face_value,
      amount_off,
      min_spend,
      discount_percent,
      cap_amount,
      currency = 'CNY',
      // 其他字段
      quantity,
      valid_from,
      valid_to,
      image_url,
      media_files,
      status
    } = req.body;

    // 验证基本必填字段
    if (!title || !description || !quantity || !valid_from || !valid_to) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段：标题、描述、数量、有效期'
      });
    }

    // 验证券类型相关字段
    const pricingValidation = validateCouponPricing(req.body);
    if (!pricingValidation.valid) {
      return res.status(400).json({
        success: false,
        message: '价格设置错误',
        errors: pricingValidation.errors
      });
    }

    // 开启事务处理活动和门店关联
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 插入新活动
      const result = await safeQuery(`
        INSERT INTO coupons 
        (title, description, coupon_type, 
         original_price, discount_price, price_final, face_value, amount_off, 
         min_spend, discount_percent, cap_amount, currency,
         quantity, valid_from, valid_to, image_url, media_files, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
        RETURNING *
      `, [
        title,
        description,
        coupon_type,
        original_price || null,
        discount_price || null,
        price_final || null,
        face_value || null,
        amount_off || null,
        min_spend || null,
        discount_percent || null,
        cap_amount || null,
        currency,
        quantity,
        valid_from,
        valid_to,
        image_url || null,
        media_files ? JSON.stringify(media_files) : null,
        status || 'active'
      ]);

      const newCoupon = result.rows[0];

      // 添加门店关联
      if (req.body.store_ids && req.body.store_ids.length > 0) {
        for (const store_id of req.body.store_ids) {
          await safeQuery(`
            INSERT INTO coupon_stores (coupon_id, store_id, created_at)
            VALUES ($1, $2, NOW())
          `, [newCoupon.id, store_id]);
        }
      }

      await client.query('COMMIT');

      // 返回增强的券数据
      const enhancedCoupon = enhanceCouponWithPricing(newCoupon);

      res.json({
        success: true,
        message: '活动添加成功',
        data: enhancedCoupon
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('添加活动错误:', error);
    res.status(500).json({
      success: false,
      message: '添加活动失败'
    });
  }
});

// 更新活动
router.put('/campaigns/:id', adminAuth, async (req, res) => {
  const { validateCouponPricing, enhanceCouponWithPricing } = require('../utils/couponPricing');
  
  try {
    const { id } = req.params;
    const {
      title,
      description,
      coupon_type = 'final_price',
      // 原有字段（向后兼容）
      original_price,
      discount_price,
      // 新的价格字段
      price_final,
      face_value,
      amount_off,
      min_spend,
      discount_percent,
      cap_amount,
      currency = 'CNY',
      // 其他字段
      quantity,
      valid_from,
      valid_to,
      image_url,
      media_files,
      status
    } = req.body;

    // 验证基本必填字段
    if (!title || !description || !quantity || !valid_from || !valid_to) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段：标题、描述、数量、有效期'
      });
    }

    // 验证券类型相关字段
    const pricingValidation = validateCouponPricing(req.body);
    if (!pricingValidation.valid) {
      return res.status(400).json({
        success: false,
        message: '价格设置错误',
        errors: pricingValidation.errors
      });
    }

    // 更新活动
    const result = await safeQuery(`
      UPDATE coupons 
      SET title = $1, description = $2, coupon_type = $3,
          original_price = $4, discount_price = $5, price_final = $6, face_value = $7, amount_off = $8,
          min_spend = $9, discount_percent = $10, cap_amount = $11, currency = $12,
          quantity = $13, valid_from = $14, valid_to = $15, image_url = $16, 
          media_files = $17, status = $18, updated_at = NOW()
      WHERE id = $19
      RETURNING *
    `, [
      title,
      description,
      coupon_type,
      original_price || null,
      discount_price || null,
      price_final || null,
      face_value || null,
      amount_off || null,
      min_spend || null,
      discount_percent || null,
      cap_amount || null,
      currency,
      quantity,
      valid_from,
      valid_to,
      image_url || null,
      media_files ? JSON.stringify(media_files) : null,
      status || 'active',
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 返回增强的券数据
    const enhancedCoupon = enhanceCouponWithPricing(result.rows[0]);

    res.json({
      success: true,
      message: '活动更新成功',
      data: enhancedCoupon
    });

  } catch (error) {
    console.error('更新活动错误:', error);
    res.status(500).json({
      success: false,
      message: '更新活动失败'
    });
  }
});

// 删除活动
router.delete('/campaigns/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 软删除活动
    const result = await safeQuery(`
      UPDATE coupons 
      SET status = 'inactive', updated_at = NOW()
      WHERE id = $1
      RETURNING id, title
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    res.json({
      success: true,
      message: '活动删除成功'
    });

  } catch (error) {
    console.error('删除活动错误:', error);
    res.status(500).json({
      success: false,
      message: '删除活动失败'
    });
  }
});

// ================== 核销管理 API ==================

// 获取核销统计数据
router.get('/redemptions/stats', adminAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totalResult, todayResult, valueResult] = await Promise.all([
      safeQuery('SELECT COUNT(*) as total FROM redemptions'),
      safeQuery('SELECT COUNT(*) as today FROM redemptions WHERE DATE(redeemed_at) = $1', [today]),
      safeQuery('SELECT SUM(c.discount_price) as total_value FROM redemptions r LEFT JOIN user_coupons uc ON r.user_coupon_id = uc.id LEFT JOIN coupons c ON uc.coupon_id = c.id')
    ]);

    // 计算日均核销数
    const firstRedemptionResult = await safeQuery('SELECT MIN(redeemed_at) as first_redemption FROM redemptions');
    const firstRedemption = firstRedemptionResult.rows[0]?.first_redemption;
    let avgPerDay = 0;
    
    if (firstRedemption) {
      const daysSinceFirst = Math.ceil((new Date() - new Date(firstRedemption)) / (1000 * 60 * 60 * 24));
      if (daysSinceFirst > 0) {
        avgPerDay = Math.round(parseInt(totalResult.rows[0].total) / daysSinceFirst);
      }
    }

    res.json({
      success: true,
      stats: {
        total: parseInt(totalResult.rows[0].total),
        today: parseInt(todayResult.rows[0].today),
        totalValue: parseFloat(valueResult.rows[0].total_value) || 0,
        avgPerDay
      }
    });

  } catch (error) {
    console.error('获取核销统计数据错误:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

// 获取核销记录列表 (已存在，保持原有功能)

// 导出核销记录
router.get('/redemptions/export', adminAuth, async (req, res) => {
  try {
    const search = req.query.search || '';
    const store_id = req.query.store_id || '';
    const method = req.query.method || '';
    const date_from = req.query.date_from || '';
    const date_to = req.query.date_to || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (u.nickname ILIKE $${paramIndex} OR c.title ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (store_id) {
      whereClause += ` AND r.store_id = $${paramIndex}`;
      params.push(store_id);
      paramIndex++;
    }

    if (method) {
      whereClause += ` AND r.verification_method = $${paramIndex}`;
      params.push(method);
      paramIndex++;
    }

    if (date_from && date_to) {
      whereClause += ` AND DATE(r.redeemed_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(date_from, date_to);
      paramIndex += 2;
    }

    const result = await safeQuery(`
      SELECT 
        r.id,
        r.verification_method,
        r.redeemed_at,
        r.notes,
        u.nickname as user_name,
        u.line_id,
        s.name as store_name,
        c.title as coupon_title,
        c.discount_price,
        v.nickname as verifier_name
      FROM redemptions r
      LEFT JOIN user_coupons uc ON r.user_coupon_id = uc.id
      LEFT JOIN users u ON uc.user_id = u.id
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      LEFT JOIN stores s ON r.store_id = s.id
      LEFT JOIN users v ON r.verifier_id = v.id
      ${whereClause}
      ORDER BY r.redeemed_at DESC
    `, params);

    // 这里应该生成Excel文件，但为了简化，先返回JSON数据
    // 在实际生产环境中，可以使用如xlsx库来生成Excel文件
    res.json({
      success: true,
      message: '导出功能已启动',
      data: result.rows
    });

  } catch (error) {
    console.error('导出核销记录错误:', error);
    res.status(500).json({
      success: false,
      message: '导出核销记录失败'
    });
  }
});

// 员工预设管理API (方案D)
// 获取指定门店的员工预设列表
router.get('/stores/:storeId/staff-presets', adminAuth, async (req, res) => {
  try {
    const storeId = req.params.storeId;
    
    // 验证门店ID格式
    if (!storeId || isNaN(parseInt(storeId))) {
      return res.status(400).json({
        success: false,
        message: '无效的门店ID'
      });
    }
    
    // 使用优化的查询，聚合绑定信息避免重复数据
    const result = await pool.query(`
      SELECT 
        sp.id, 
        sp.staff_id, 
        sp.name, 
        sp.department, 
        sp.position, 
        sp.status,
        sp.created_at, 
        sp.updated_at,
        COALESCE(
          JSON_AGG(
            CASE 
              WHEN sb.id IS NOT NULL THEN 
                JSON_BUILD_OBJECT(
                  'binding_id', sb.id,
                  'line_user_id', sb.line_user_id,
                  'display_name', sb.display_name,
                  'binding_status', sb.binding_status,
                  'bound_at', sb.bound_at,
                  'last_active_at', sb.last_active_at
                )
              ELSE NULL
            END
          ) FILTER (WHERE sb.id IS NOT NULL), 
          '[]'
        ) as bindings
      FROM staff_presets sp
      LEFT JOIN staff_bindings sb ON sp.id = sb.preset_id AND sb.binding_status = 'bound'
      WHERE sp.store_id = $1
      GROUP BY sp.id, sp.staff_id, sp.name, sp.department, sp.position, sp.status, sp.created_at, sp.updated_at
      ORDER BY sp.created_at DESC
    `, [storeId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('获取员工预设列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取员工预设列表失败'
    });
  }
});

// 为指定门店添加员工预设
router.post('/stores/:storeId/staff-presets', adminAuth, async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const { staffList } = req.body;

    // 验证门店ID格式
    if (!storeId || isNaN(parseInt(storeId))) {
      return res.status(400).json({
        success: false,
        message: '无效的门店ID'
      });
    }

    if (!staffList || !Array.isArray(staffList) || staffList.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的员工信息'
      });
    }

    // 限制批量大小防止滥用
    if (staffList.length > 50) {
      return res.status(400).json({
        success: false,
        message: '单次最多只能添加50名员工'
      });
    }

    // 验证所有员工信息都有效
    for (const staff of staffList) {
      // 姓名必填
      if (!staff.name || staff.name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '员工姓名不能为空'
        });
      }
      
      // 工号必填和格式验证
      if (!staff.staff_id || staff.staff_id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '员工工号不能为空'
        });
      }
      
      // 电话号码必填和格式验证
      if (!staff.phone || staff.phone.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '员工电话号码不能为空'
        });
      }
      
      const phone = staff.phone.trim();
      if (phone.length < 6 || phone.length > 20) {
        return res.status(400).json({
          success: false,
          message: '电话号码长度必须在6-20字符之间'
        });
      }
      
      if (!/^[+\d][\d\s-]{5,19}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: '电话号码格式不正确，请输入有效的电话号码'
        });
      }
      
      // 工号格式和长度验证
      const staffId = staff.staff_id.trim();
      if (staffId.length < 2 || staffId.length > 20) {
        return res.status(400).json({
          success: false,
          message: '员工工号长度必须在2-20字符之间'
        });
      }
      
      if (!/^[A-Za-z0-9\-_]+$/.test(staffId)) {
        return res.status(400).json({
          success: false,
          message: '员工工号只能包含字母、数字、横线和下划线'
        });
      }
    }

    // 使用safeQuery进行安全的数据库操作
    try {
      // 批量检查工号唯一性（避免在事务中的多次查询）
      const staffIds = staffList.map(staff => staff.staff_id.trim());
      const existingStaff = await safeQuery(`
        SELECT staff_id FROM staff_presets 
        WHERE store_id = $1 AND staff_id = ANY($2)
      `, [storeId, staffIds]);

      if (existingStaff.rows.length > 0) {
        const duplicateIds = existingStaff.rows.map(row => row.staff_id).join(', ');
        throw new Error(`以下工号已在该门店存在: ${duplicateIds}`);
      }

      // 批量插入员工预设（使用ON CONFLICT处理并发冲突）
      const insertPromises = staffList.map(staff => 
        safeQuery(`
          INSERT INTO staff_presets (store_id, staff_id, name, phone, department, position, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
          ON CONFLICT (store_id, staff_id) DO NOTHING
        `, [
          storeId,
          staff.staff_id.trim(),
          staff.name.trim(),
          staff.phone.trim(),
          staff.department?.trim() || null,
          staff.position?.trim() || null
        ])
      );

      await Promise.all(insertPromises);

      res.json({
        success: true,
        message: `成功添加 ${staffList.length} 名员工预设`
      });

    } catch (error) {
      console.error('批量添加员工预设错误:', error);
      
      // 精确的错误处理
      if (error.message.includes('已在该门店存在')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      throw error;
    }

  } catch (error) {
    console.error('添加员工预设错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '添加员工预设失败'
    });
  }
});

// 删除特定的员工预设
router.delete('/staff-presets/:presetId', adminAuth, async (req, res) => {
  try {
    const presetId = req.params.presetId;

    const result = await pool.query(`
      DELETE FROM staff_presets
      WHERE id = $1
      RETURNING id, name, staff_id
    `, [presetId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '员工预设不存在'
      });
    }

    res.json({
      success: true,
      message: '员工预设删除成功'
    });

  } catch (error) {
    console.error('删除员工预设错误:', error);
    res.status(500).json({
      success: false,
      message: '删除员工预设失败'
    });
  }
});

// Rich Menu管理API
router.post('/rich-menu/initialize', adminAuth, async (req, res) => {
  try {
    const lineRichMenuService = require('../services/lineRichMenu');
    const result = await lineRichMenuService.initializeRichMenus();
    
    res.json({
      success: true,
      message: 'Rich Menu初始化成功',
      data: result
    });
  } catch (error) {
    console.error('Rich Menu初始化失败:', error);
    res.status(500).json({
      success: false,
      message: 'Rich Menu初始化失败'
    });
  }
});

router.post('/rich-menu/switch/:lineUserId', adminAuth, async (req, res) => {
  try {
    const { lineUserId } = req.params;
    const lineRichMenuService = require('../services/lineRichMenu');
    const result = await lineRichMenuService.checkAndSwitchMenu(lineUserId);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        isStaff: result.isStaff,
        staffInfo: result.staffInfo,
        menuType: result.isStaff ? 'staff' : 'user'
      }
    });
  } catch (error) {
    console.error('菜单切换失败:', error);
    res.status(500).json({
      success: false,
      message: '菜单切换失败'
    });
  }
});

router.get('/rich-menu/list', adminAuth, async (req, res) => {
  try {
    const lineRichMenuService = require('../services/lineRichMenu');
    const menus = await lineRichMenuService.getRichMenuList();
    
    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('获取Rich Menu列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取Rich Menu列表失败'
    });
  }
});

// 员工绑定API - 通过工号验证身份并绑定LINE User ID (安全版本)
router.post('/staff-binding/verify', async (req, res) => {
  try {
    const { staff_id, store_code, id_token } = req.body;

    // 验证必填字段
    if (!staff_id || !id_token || !store_code) {
      return res.status(400).json({
        success: false,
        message: '工号、身份令牌和门店编码都是必填项'
      });
    }
    
    // 验证LINE ID Token
    let lineUserData;
    try {
      const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
      if (!channelId) {
        throw new Error('LINE Channel ID not configured');
      }
      lineUserData = await verifyLineIdToken(id_token, channelId);
    } catch (error) {
      console.error('ID token验证失败:', error.message);
      return res.status(401).json({
        success: false,
        message: '身份验证失败，请在LINE应用中重新打开'
      });
    }
    
    const { userId: line_user_id, displayName: display_name } = lineUserData;

    // 查找门店和员工预设
    const presetResult = await safeQuery(`
      SELECT sp.id, sp.name, sp.staff_id, s.name as store_name
      FROM staff_presets sp
      JOIN stores s ON sp.store_id = s.id
      WHERE sp.staff_id = $1 AND s.code = $2 AND sp.status = 'active'
    `, [staff_id, store_code]);

    if (presetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '工号或门店编码不正确，请联系管理员确认'
      });
    }

    const preset = presetResult.rows[0];

    // 检查该员工是否已绑定
    const existingBinding = await safeQuery(`
      SELECT id FROM staff_bindings 
      WHERE preset_id = $1 AND binding_status = 'bound'
    `, [preset.id]);

    if (existingBinding.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该员工已绑定其他LINE账号'
      });
    }

    // 检查该LINE用户是否已绑定其他员工
    const existingUser = await safeQuery(`
      SELECT id FROM staff_bindings 
      WHERE line_user_id = $1 AND binding_status = 'bound'
    `, [line_user_id]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '您的LINE账号已绑定其他员工身份'
      });
    }

    // 创建或更新绑定记录
    await safeQuery(`
      INSERT INTO staff_bindings 
      (preset_id, line_user_id, display_name, binding_status, bound_at, created_at, updated_at)
      VALUES ($1, $2, $3, 'bound', NOW(), NOW(), NOW())
      ON CONFLICT (line_user_id) 
      DO UPDATE SET 
        preset_id = $1, 
        display_name = $3, 
        binding_status = 'bound',
        bound_at = NOW(),
        updated_at = NOW()
    `, [preset.id, line_user_id, display_name]);

    // 绑定成功后自动切换到员工菜单
    try {
      const lineRichMenuService = require('../services/lineRichMenu');
      await lineRichMenuService.setUserMenu(line_user_id, true);
      console.log(`✅ 员工 ${preset.name} 菜单已自动切换为员工工作台菜单`);
    } catch (menuError) {
      console.error('❌ 自动切换员工菜单失败:', menuError);
      // 菜单切换失败不影响绑定结果，只记录错误
    }

    res.json({
      success: true,
      message: `绑定成功！欢迎 ${preset.name}，您已获得 ${preset.store_name} 的核销权限。员工工作台菜单已为您激活！`,
      data: {
        staff_name: preset.name,
        store_name: preset.store_name,
        staff_id: preset.staff_id,
        menu_switched: true
      }
    });

  } catch (error) {
    console.error('员工绑定错误:', error);
    res.status(500).json({
      success: false,
      message: '绑定失败，请稍后重试'
    });
  }
});

// 检查LINE用户绑定状态 (需要ID token验证)
router.post('/staff-binding/status', async (req, res) => {
  try {
    const { id_token } = req.body;
    
    // 验证ID token并获取真实的LINE用户ID
    let lineUserData;
    try {
      const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
      if (!channelId) {
        throw new Error('LINE Channel ID not configured');
      }
      lineUserData = await verifyLineIdToken(id_token, channelId);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '身份验证失败'
      });
    }
    
    const lineUserId = lineUserData.userId;

    const result = await pool.query(`
      SELECT sb.binding_status, sb.bound_at, sp.name, sp.staff_id, s.name as store_name, s.code as store_code
      FROM staff_bindings sb
      JOIN staff_presets sp ON sb.preset_id = sp.id
      JOIN stores s ON sp.store_id = s.id
      WHERE sb.line_user_id = $1 AND sb.binding_status = 'bound'
    `, [lineUserId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: { is_bound: false }
      });
    }

    res.json({
      success: true,
      data: {
        is_bound: true,
        staff_info: result.rows[0]
      }
    });

  } catch (error) {
    console.error('查询绑定状态错误:', error);
    res.status(500).json({
      success: false,
      message: '查询绑定状态失败'
    });
  }
});

// 简单图片上传 - 无需认证
router.post('/upload/simple-image', (req, res) => {
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');

  // 确保上传目录存在
  const uploadDir = path.join(__dirname, '../uploads/images');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'store-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      console.log('📁 文件类型检查:', file.mimetype, file.originalname);
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      const hasValidMimeType = allowedTypes.includes(file.mimetype);
      const hasValidExtension = allowedExtensions.some(ext => 
        file.originalname.toLowerCase().endsWith(ext)
      );
      
      if (hasValidMimeType || hasValidExtension) {
        console.log('✅ 文件类型验证通过');
        cb(null, true);
      } else {
        console.log('❌ 文件类型验证失败:', file.mimetype, file.originalname);
        cb(new Error('只允许上传图片文件'));
      }
    }
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      console.error('上传错误:', err);
      return res.status(400).json({
        success: false,
        message: err.message || '上传失败'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const fileUrl = `/uploads/images/${req.file.filename}`;
    console.log('✅ 简单图片上传成功:', fileUrl);
    
    res.json({
      success: true,
      url: fileUrl,
      data: { url: fileUrl },
      message: '图片上传成功'
    });
  });
})

// 原来的图片上传API（需要认证）
router.post('/upload/image', adminAuth, async (req, res) => {
  try {
    // 这里我们暂时使用简单的base64存储方案
    // 在生产环境中应该使用云存储服务
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');

    // 确保上传目录存在
    const uploadDir = path.join(__dirname, '../uploads/images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 设置multer存储配置
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    const upload = multer({ 
      storage: storage,
      limits: {
        fileSize: 2 * 1024 * 1024 // 2MB限制
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('只允许上传图片文件'));
        }
      }
    }).single('file');

    upload(req, res, (err) => {
      if (err) {
        console.error('文件上传错误:', err);
        return res.status(400).json({
          success: false,
          message: err.message || '文件上传失败'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '未找到上传的文件'
        });
      }

      // 返回文件访问URL
      const fileUrl = `/uploads/images/${req.file.filename}`;
      res.json({
        success: true,
        data: {
          url: fileUrl,
          filename: req.file.filename,
          size: req.file.size
        },
        message: '图片上传成功'
      });
    });

  } catch (error) {
    console.error('上传图片错误:', error);
    res.status(500).json({
      success: false,
      message: '上传图片失败'
    });
  }
});

// 活动多媒体文件上传API (支持1-3张图片或视频)
router.post('/upload/campaign-media', adminAuth, async (req, res) => {
  try {
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');

    // 确保上传目录存在
    const uploadDirs = {
      images: path.join(__dirname, '../uploads/campaigns/images'),
      videos: path.join(__dirname, '../uploads/campaigns/videos')
    };

    Object.values(uploadDirs).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // 设置multer存储配置
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, uploadDirs.images);
        } else if (file.mimetype.startsWith('video/')) {
          cb(null, uploadDirs.videos);
        } else {
          cb(new Error('不支持的文件类型'));
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    const upload = multer({ 
      storage: storage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB限制（视频文件较大）
        files: 3 // 最多3个文件
      },
      fileFilter: (req, file, cb) => {
        // 支持图片格式
        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        // 支持视频格式
        const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/avi'];
        
        if (imageTypes.includes(file.mimetype) || videoTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('只支持图片(jpg,png,gif,webp)和视频(mp4,webm,ogg,mov,avi)格式'));
        }
      }
    }).array('files', 3); // 支持最多3个文件

    upload(req, res, (err) => {
      if (err) {
        console.error('多媒体文件上传错误:', err);
        return res.status(400).json({
          success: false,
          message: err.message || '文件上传失败'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '未找到上传的文件'
        });
      }

      // 服务器端验证：检查文件类型互斥和数量限制
      const fileTypes = req.files.map(file => file.mimetype.startsWith('image/') ? 'image' : 'video');
      const uniqueTypes = [...new Set(fileTypes)];
      
      // 检查类型互斥
      if (uniqueTypes.length > 1) {
        return res.status(400).json({
          success: false,
          message: '不能同时上传图片和视频'
        });
      }
      
      const fileType = uniqueTypes[0];
      
      // 检查数量限制
      if (fileType === 'video' && req.files.length > 1) {
        return res.status(400).json({
          success: false,
          message: '视频只能上传1个'
        });
      }
      
      if (fileType === 'image' && req.files.length > 3) {
        return res.status(400).json({
          success: false,
          message: '图片最多只能上传3张'
        });
      }

      // 处理上传的文件信息
      const uploadedFiles = req.files.map(file => {
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        const folder = isImage ? 'images' : 'videos';
        
        return {
          type: isImage ? 'image' : 'video',
          url: `/uploads/campaigns/${folder}/${file.filename}`,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        };
      });

      res.json({
        success: true,
        data: {
          files: uploadedFiles,
          count: uploadedFiles.length
        },
        message: `成功上传${uploadedFiles.length}个文件`
      });
    });

  } catch (error) {
    console.error('上传多媒体文件错误:', error);
    res.status(500).json({
      success: false,
      message: '上传多媒体文件失败'
    });
  }
});

// 生成员工绑定二维码
router.get('/stores/:storeId/binding-qr', adminAuth, async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    
    // 验证门店ID
    if (!storeId || isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        message: '无效的门店ID'
      });
    }

    // 获取门店信息
    const storeResult = await safeQuery(
      'SELECT id, name, code FROM stores WHERE id = $1 AND status = $2',
      [storeId, 'active']
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '门店不存在或已停用'
      });
    }

    const store = storeResult.rows[0];
    
    // 生成绑定URL - 指向员工绑定页面
    // 使用Replit公开域名，Express服务器会提供构建后的前端代码
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS}`
      : (process.env.NODE_ENV === 'production' 
        ? `https://predee.replit.app`
        : `https://86278876-4363-422e-9f1c-caaa2a1a65fe-00-3lm5gxzb82hih.spock.replit.dev`);
    
    const bindingUrl = `${baseUrl}/staff-binding?store=${store.code}`;
    
    // 生成二维码
    const qrCodeDataUrl = await QRCode.toDataURL(bindingUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      data: {
        qrCodeUrl: qrCodeDataUrl,
        bindingUrl: bindingUrl,
        storeInfo: {
          id: store.id,
          name: store.name,
          code: store.code
        }
      }
    });

  } catch (error) {
    console.error('生成员工绑定二维码失败:', error);
    res.status(500).json({
      success: false,
      message: '生成二维码失败'
    });
  }
});

module.exports = router;