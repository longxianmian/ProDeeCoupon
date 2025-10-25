const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../storage');
const { 
  users,
  stores,
  rewardItems, 
  rewardRedemptions,
  pointTransactions,
  pointBuckets
} = require('../../shared/schema');
const { eq, and, sql, desc } = require('drizzle-orm');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { translationService } = require('../services/translation');
const { pickUserId } = require('../utils/safe');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;

// 管理员身份验证中间件
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供访问令牌'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '仅限管理员访问'
      });
    }
    
    req.admin = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'admin'
    };
    
    next();
  } catch (error) {
    console.error('管理员认证错误:', error.message);
    res.status(401).json({
      success: false,
      message: '无效的访问令牌'
    });
  }
};

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, is_active = 'true' } = req.query;

    let query = db
      .select()
      .from(rewardItems)
      .orderBy(desc(rewardItems.created_at));

    if (is_active === 'true') {
      query = query.where(eq(rewardItems.is_active, true));
    }

    if (type) {
      query = query.where(
        and(
          eq(rewardItems.is_active, true),
          eq(rewardItems.type, type)
        )
      );
    }

    const items = await query;

    res.json({
      success: true,
      data: items.map(item => ({
        id: item.id,
        type: item.type,
        name: item.title,
        title: item.title,
        title_zh_cn: item.title_zh_cn,
        title_en_us: item.title_en_us,
        title_th_th: item.title_th_th,
        description: item.description,
        description_zh_cn: item.description_zh_cn,
        description_en_us: item.description_en_us,
        description_th_th: item.description_th_th,
        image_url: item.cover,
        points_required: item.points_cost,
        cash_price: item.cash_price ? parseFloat(item.cash_price) : null,
        stock: item.stock,
        attrs: item.attrs,
        is_active: item.is_active,
        created_at: item.created_at
      }))
    });
  } catch (error) {
    console.error('获取积分商城列表失败:', error);
    res.status(500).json({ success: false, error: 'Failed to get reward items' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);

    const [item] = await db
      .select()
      .from(rewardItems)
      .where(eq(rewardItems.id, itemId))
      .limit(1);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({
      success: true,
      data: {
        id: item.id,
        type: item.type,
        name: item.title,
        title: item.title,
        title_zh_cn: item.title_zh_cn,
        title_en_us: item.title_en_us,
        title_th_th: item.title_th_th,
        description: item.description,
        description_zh_cn: item.description_zh_cn,
        description_en_us: item.description_en_us,
        description_th_th: item.description_th_th,
        image_url: item.cover,
        images: item.images,
        points_required: item.points_cost,
        cash_price: item.cash_price ? parseFloat(item.cash_price) : null,
        stock: item.stock,
        attrs: item.attrs,
        is_active: item.is_active,
        created_at: item.created_at,
        payment_methods: item.cash_price ? ['points', 'cash', 'mixed'] : ['points']
      }
    });
  } catch (error) {
    console.error('获取商品详情失败:', error);
    res.status(500).json({ success: false, error: 'Failed to get item details' });
  }
});

router.post('/redeem', verifyToken, async (req, res) => {
  try {
    const { item_id } = req.body;
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }
    
    const idempotencyKey = req.headers['idempotency-key'];

    if (!idempotencyKey) {
      return res.status(400).json({ success: false, error: 'Idempotency-Key header required' });
    }

    if (!item_id) {
      return res.status(400).json({ success: false, error: 'item_id is required' });
    }

    const existing = await db
      .select()
      .from(rewardRedemptions)
      .where(
        and(
          eq(rewardRedemptions.user_id, userId),
          sql`payload->>'idempotency_key' = ${idempotencyKey}`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.json({ 
        success: true,
        message: 'Already redeemed',
        data: {
          redemption: existing[0]
        }
      });
    }

    const [item] = await db
      .select()
      .from(rewardItems)
      .where(eq(rewardItems.id, item_id))
      .limit(1);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (!item.is_active) {
      return res.status(400).json({ success: false, error: 'Item is not available' });
    }

    if (item.stock !== null && item.stock <= 0) {
      return res.status(400).json({ success: false, error: 'Out of stock' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.points < item.points_cost) {
      return res.status(400).json({ success: false, error: 'Insufficient points' });
    }

    const result = await db.transaction(async (tx) => {
      const buckets = await tx
        .select()
        .from(pointBuckets)
        .where(
          and(
            eq(pointBuckets.user_id, userId),
            sql`remaining > 0`
          )
        )
        .orderBy(pointBuckets.expire_at)
        .for('update');

      let remainingToSpend = item.points_cost;
      const bucketsUsed = [];

      for (const bucket of buckets) {
        if (remainingToSpend <= 0) break;

        const toDeduct = Math.min(bucket.remaining, remainingToSpend);
        
        await tx
          .update(pointBuckets)
          .set({
            remaining: bucket.remaining - toDeduct
          })
          .where(eq(pointBuckets.id, bucket.id));

        bucketsUsed.push({
          bucket_id: bucket.id,
          points: toDeduct
        });

        remainingToSpend -= toDeduct;
      }

      let payload = {
        idempotency_key: idempotencyKey,
        redeemed_at: new Date().toISOString()
      };

      if (item.type === 'coupon') {
        const couponCode = `RW${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        payload = {
          ...payload,
          coupon_code: couponCode,
          valid_days: item.attrs?.valid_days || 30,
          expires_at: new Date(Date.now() + (item.attrs?.valid_days || 30) * 24 * 60 * 60 * 1000).toISOString()
        };
      } else if (item.type === 'virtual') {
        const redeemCode = `VR${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        payload = {
          ...payload,
          redeem_code: redeemCode,
          vendor: item.attrs?.vendor || 'default'
        };
      }

      const [redemption] = await tx
        .insert(rewardRedemptions)
        .values({
          user_id: userId,
          item_id: item.id,
          points_cost: item.points_cost,
          status: 'success',
          payload
        })
        .returning();

      await tx
        .insert(pointTransactions)
        .values({
          user_id: userId,
          type: 'spend',
          amount: -item.points_cost,
          description: `兑换商品: ${item.title}`,
          status: 'posted',
          idempotency_key: idempotencyKey,
          reason_code: 'redeem',
          metadata: { 
            buckets_used: bucketsUsed,
            redemption_id: redemption.id,
            item_id: item.id
          }
        });

      await tx
        .update(users)
        .set({
          points: sql`points - ${item.points_cost}`
        })
        .where(eq(users.id, userId));

      if (item.stock !== null) {
        await tx
          .update(rewardItems)
          .set({
            stock: sql`stock - 1`
          })
          .where(eq(rewardItems.id, item.id));
      }

      return { redemption, item };
    });

    res.json({
      success: true,
      data: {
        redemption: result.redemption,
        item: result.item
      }
    });
  } catch (error) {
    console.error('兑换失败:', error);
    res.status(500).json({ success: false, error: 'Failed to redeem item' });
  }
});

router.get('/my-redemptions', verifyToken, async (req, res) => {
  try {
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }
    
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const redemptions = await db
      .select({
        redemption: rewardRedemptions,
        item: rewardItems
      })
      .from(rewardRedemptions)
      .leftJoin(rewardItems, eq(rewardRedemptions.item_id, rewardItems.id))
      .where(eq(rewardRedemptions.user_id, userId))
      .orderBy(desc(rewardRedemptions.created_at))
      .limit(parseInt(limit))
      .offset(offset);

    res.json({
      success: true,
      data: redemptions.map(r => ({
        id: r.redemption.id,
        item_id: r.redemption.item_id,
        points_spent: r.redemption.points_cost,
        status: r.redemption.status,
        payload: r.redemption.payload,
        created_at: r.redemption.created_at,
        reward: {
          name: r.item?.title,
          image_url: r.item?.cover
        }
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取兑换记录失败:', error);
    res.status(500).json({ success: false, error: 'Failed to get redemption history' });
  }
});

// ==================== 管理端API ====================

// 获取商品列表（管理端）
router.get('/admin/items', adminAuth, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    
    // 构建查询条件
    let conditions = [];
    if (type) conditions.push(eq(rewardItems.type, type));
    if (status) conditions.push(eq(rewardItems.status, status));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // 查询商品列表
    const items = await db
      .select()
      .from(rewardItems)
      .where(whereClause)
      .orderBy(desc(rewardItems.sort_order), desc(rewardItems.id))
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit));
    
    // 统计总数
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(rewardItems)
      .where(whereClause);
    
    const total = parseInt(countResult[0]?.count || 0);
    
    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ 获取商品列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取商品列表失败',
      error: error.message
    });
  }
});

// 获取单个商品详情（管理端）
router.get('/admin/items/:id', adminAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    const items = await db
      .select()
      .from(rewardItems)
      .where(eq(rewardItems.id, itemId))
      .limit(1);
    
    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }
    
    res.json({
      success: true,
      data: items[0]
    });
  } catch (error) {
    console.error('❌ 获取商品详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取商品详情失败',
      error: error.message
    });
  }
});

// 创建商品（管理端）
router.post('/admin/items', adminAuth, async (req, res) => {
  try {
    const {
      type,
      title,
      title_zh_cn,
      title_en_us,
      title_th_th,
      description,
      description_zh_cn,
      description_en_us,
      description_th_th,
      cover,
      images,
      points_cost,
      cash_price,
      cost,
      stock,
      stock_alert,
      tags,
      channels,
      visibility,
      status,
      sort_order
    } = req.body;
    
    // 验证必填字段
    if (!type || !title || !points_cost) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段：type, title, points_cost'
      });
    }
    
    // 插入新商品
    const result = await db.insert(rewardItems).values({
      type,
      title,
      title_zh_cn,
      title_en_us,
      title_th_th,
      description,
      description_zh_cn,
      description_en_us,
      description_th_th,
      cover,
      images: images ? JSON.stringify(images) : null,
      points_cost: parseInt(points_cost),
      cash_price: cash_price ? parseFloat(cash_price) : null,
      cost: cost ? parseFloat(cost) : null,
      stock: stock ? parseInt(stock) : null,
      stock_alert: stock_alert ? parseInt(stock_alert) : 10,
      tags: tags || [],
      channels: channels || [],
      visibility: visibility || 'public',
      status: status || 'draft',
      sort_order: sort_order || 0,
      is_active: status === 'live' ? true : false,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    console.log('✅ 商品创建成功:', result[0].id);
    
    res.json({
      success: true,
      message: '商品创建成功',
      data: result[0]
    });
  } catch (error) {
    console.error('❌ 创建商品失败:', error);
    res.status(500).json({
      success: false,
      message: '创建商品失败',
      error: error.message
    });
  }
});

// 更新商品（管理端）
router.put('/admin/items/:id', adminAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const updateData = { ...req.body };
    
    // 删除不应该更新的字段
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;
    
    // 处理JSON字段
    if (updateData.images && typeof updateData.images === 'object') {
      updateData.images = JSON.stringify(updateData.images);
    }
    
    // 处理数值字段
    if (updateData.points_cost) updateData.points_cost = parseInt(updateData.points_cost);
    if (updateData.cash_price) updateData.cash_price = parseFloat(updateData.cash_price);
    if (updateData.cost) updateData.cost = parseFloat(updateData.cost);
    if (updateData.stock !== undefined && updateData.stock !== null) {
      updateData.stock = parseInt(updateData.stock);
    }
    if (updateData.stock_alert) updateData.stock_alert = parseInt(updateData.stock_alert);
    if (updateData.sort_order !== undefined) updateData.sort_order = parseInt(updateData.sort_order);
    
    // 同步状态和is_active字段
    if (updateData.status) {
      updateData.is_active = (updateData.status === 'live');
    }
    
    // 添加更新时间
    updateData.updated_at = new Date();
    
    const result = await db
      .update(rewardItems)
      .set(updateData)
      .where(eq(rewardItems.id, itemId))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }
    
    console.log('✅ 商品更新成功:', itemId);
    
    res.json({
      success: true,
      message: '商品更新成功',
      data: result[0]
    });
  } catch (error) {
    console.error('❌ 更新商品失败:', error);
    res.status(500).json({
      success: false,
      message: '更新商品失败',
      error: error.message
    });
  }
});

// 删除商品（管理端）
router.delete('/admin/items/:id', adminAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    // 检查是否有关联的兑换记录
    const redemptions = await db
      .select()
      .from(rewardRedemptions)
      .where(eq(rewardRedemptions.item_id, itemId))
      .limit(1);
    
    if (redemptions.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该商品已有兑换记录，无法删除。建议改为下线状态。'
      });
    }
    
    const result = await db
      .delete(rewardItems)
      .where(eq(rewardItems.id, itemId))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }
    
    console.log('✅ 商品删除成功:', itemId);
    
    res.json({
      success: true,
      message: '商品删除成功'
    });
  } catch (error) {
    console.error('❌ 删除商品失败:', error);
    res.status(500).json({
      success: false,
      message: '删除商品失败',
      error: error.message
    });
  }
});

// 翻译商品内容（管理端）
router.post('/admin/items/:id/translate', adminAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    // 获取商品数据
    const items = await db
      .select()
      .from(rewardItems)
      .where(eq(rewardItems.id, itemId))
      .limit(1);
    
    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }
    
    const item = items[0];
    
    // 生成翻译
    const translations = await translationService.translateReward({
      title: item.title,
      description: item.description || ''
    });
    
    // 更新数据库
    const result = await db.update(rewardItems)
      .set({
        title_zh_cn: translations.title_zh_cn,
        title_en_us: translations.title_en_us,
        title_th_th: translations.title_th_th,
        description_zh_cn: translations.description_zh_cn,
        description_en_us: translations.description_en_us,
        description_th_th: translations.description_th_th,
        updated_at: new Date()
      })
      .where(eq(rewardItems.id, itemId))
      .returning();
    
    console.log('✅ 商品翻译成功:', itemId);
    
    res.json({
      success: true,
      message: '商品翻译完成',
      data: result[0]
    });
  } catch (error) {
    console.error('❌ 翻译商品失败:', error);
    res.status(500).json({
      success: false,
      message: '翻译商品失败',
      error: error.message
    });
  }
});

module.exports = router;
