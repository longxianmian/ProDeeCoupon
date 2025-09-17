/**
 * 翻译API路由
 * 提供QWEN翻译服务的RESTful接口
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { translationService } = require('../services/translation');
const { db } = require('../storage');
const { coupons, stores } = require('../../shared/schema');
const { eq } = require('drizzle-orm');

const router = express.Router();

// JWT密钥检查
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ 致命错误: 未设置JWT_SECRET环境变量');
  console.error('请设置JWT_SECRET环境变量后重启服务器');
  process.exit(1);
}

// 管理员身份验证中间件
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供访问令牌，翻译功能需要管理员权限'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 验证是否为管理员角色
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '翻译功能仅限管理员使用'
      });
    }
    
    req.admin = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'admin'
    };
    console.log('✅ Translation AdminAuth: JWT验证成功:', decoded.email);
    
    next();
  } catch (error) {
    console.error('翻译API管理员认证错误:', error.message);
    res.status(401).json({
      success: false,
      message: '无效的访问令牌'
    });
  }
};

// 翻译服务状态检查
router.get('/status', async (req, res) => {
  try {
    const status = await translationService.checkStatus();
    res.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 测试翻译单个文本 - 需要管理员权限
router.post('/test', adminAuth, async (req, res) => {
  try {
    const { text, targetLang = 'en-us' } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: '缺少要翻译的文本'
      });
    }

    const result = await translationService.translateText(text, targetLang);
    
    res.json({
      success: true,
      data: {
        originalText: text,
        translatedText: result,
        targetLanguage: targetLang
      }
    });
  } catch (error) {
    console.error('🚨 翻译测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 翻译优惠券内容 - 需要管理员权限
router.post('/coupon/:id', adminAuth, async (req, res) => {
  try {
    const couponId = parseInt(req.params.id);
    
    // 获取优惠券数据
    const couponData = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);
    
    if (couponData.length === 0) {
      return res.status(404).json({
        success: false,
        error: '优惠券不存在'
      });
    }

    const coupon = couponData[0];
    
    // 生成翻译
    const translations = await translationService.translateCoupon({
      title: coupon.title,
      description: coupon.description || ''
    });

    // 更新数据库
    await db.update(coupons)
      .set({
        title_zh_cn: translations.title_zh_cn,
        title_en_us: translations.title_en_us,
        title_th_th: translations.title_th_th,
        description_zh_cn: translations.description_zh_cn,
        description_en_us: translations.description_en_us,
        description_th_th: translations.description_th_th,
        updated_at: new Date()
      })
      .where(eq(coupons.id, couponId));

    res.json({
      success: true,
      message: '优惠券翻译完成',
      data: {
        couponId,
        translations
      }
    });
  } catch (error) {
    console.error('🚨 优惠券翻译失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 翻译门店信息 - 需要管理员权限
router.post('/store/:id', adminAuth, async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);
    
    // 获取门店数据
    const storeData = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    
    if (storeData.length === 0) {
      return res.status(404).json({
        success: false,
        error: '门店不存在'
      });
    }

    const store = storeData[0];
    
    // 生成翻译
    const translations = await translationService.translateStore({
      name: store.name,
      address: store.address
    });

    // 更新数据库
    await db.update(stores)
      .set({
        name_zh_cn: translations.name_zh_cn,
        name_en_us: translations.name_en_us,
        name_th_th: translations.name_th_th,
        address_zh_cn: translations.address_zh_cn,
        address_en_us: translations.address_en_us,
        address_th_th: translations.address_th_th,
        updated_at: new Date()
      })
      .where(eq(stores.id, storeId));

    res.json({
      success: true,
      message: '门店信息翻译完成',
      data: {
        storeId,
        translations
      }
    });
  } catch (error) {
    console.error('🚨 门店翻译失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量翻译所有优惠券 - 需要管理员权限
router.post('/batch/coupons', adminAuth, async (req, res) => {
  try {
    // 获取所有活跃的优惠券
    const allCoupons = await db.select().from(coupons).where(eq(coupons.status, 'active'));
    
    let translated = 0;
    let failed = 0;
    const errors = [];

    for (const coupon of allCoupons) {
      try {
        // 检查是否已经有翻译
        if (coupon.title_en_us && coupon.title_th_th) {
          console.log(`⏭️  优惠券 ${coupon.id} 已有翻译，跳过`);
          continue;
        }

        console.log(`🔄 翻译优惠券 ${coupon.id}: ${coupon.title}`);
        
        const translations = await translationService.translateCoupon({
          title: coupon.title,
          description: coupon.description || ''
        });

        await db.update(coupons)
          .set({
            title_zh_cn: translations.title_zh_cn,
            title_en_us: translations.title_en_us,
            title_th_th: translations.title_th_th,
            description_zh_cn: translations.description_zh_cn,
            description_en_us: translations.description_en_us,
            description_th_th: translations.description_th_th,
            updated_at: new Date()
          })
          .where(eq(coupons.id, coupon.id));

        translated++;
        
        // 添加延迟避免API频率限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`🚨 优惠券 ${coupon.id} 翻译失败:`, error.message);
        failed++;
        errors.push({ couponId: coupon.id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: '批量翻译完成',
      data: {
        total: allCoupons.length,
        translated,
        failed,
        errors: failed > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('🚨 批量翻译失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量翻译所有门店 - 需要管理员权限
router.post('/batch/stores', adminAuth, async (req, res) => {
  try {
    // 获取所有活跃的门店
    const allStores = await db.select().from(stores).where(eq(stores.status, 'active'));
    
    let translated = 0;
    let failed = 0;
    const errors = [];

    for (const store of allStores) {
      try {
        // 检查是否已经有翻译
        if (store.name_en_us && store.name_th_th) {
          console.log(`⏭️  门店 ${store.id} 已有翻译，跳过`);
          continue;
        }

        console.log(`🔄 翻译门店 ${store.id}: ${store.name}`);
        
        const translations = await translationService.translateStore({
          name: store.name,
          address: store.address
        });

        await db.update(stores)
          .set({
            name_zh_cn: translations.name_zh_cn,
            name_en_us: translations.name_en_us,
            name_th_th: translations.name_th_th,
            address_zh_cn: translations.address_zh_cn,
            address_en_us: translations.address_en_us,
            address_th_th: translations.address_th_th,
            updated_at: new Date()
          })
          .where(eq(stores.id, store.id));

        translated++;
        
        // 添加延迟避免API频率限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`🚨 门店 ${store.id} 翻译失败:`, error.message);
        failed++;
        errors.push({ storeId: store.id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: '批量翻译完成',
      data: {
        total: allStores.length,
        translated,
        failed,
        errors: failed > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('🚨 批量翻译失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;