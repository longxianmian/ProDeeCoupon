const express = require('express');
const router = express.Router();

// 临时调试API已移除 - 问题已诊断完成

// 首页Feed API - 返回综合内容（优惠券 + Posts内容）
router.get('/feed', async (req, res) => {
  try {
    console.log('📱 API调用 /api/home/feed');
    const { dbService } = require('../storage.js');
    
    // 并行获取优惠券和内容
    const [coupons, posts] = await Promise.all([
      // 获取活跃优惠券
      dbService.getActiveCoupons({
        limit: 20,
        offset: 0,
        status: 'active'
      }),
      // 获取已发布的posts内容
      dbService.query(`
        SELECT 
          id, type, title, content,
          title_zh_cn, title_en_us, title_th_th,
          content_zh_cn, content_en_us, content_th_th,
          media_files, coupon_id, activity_id,
          cta_type, cta_text, cta_link,
          poster, published_at, created_at, updated_at,
          likes_count, comments_count, favorites_count, shares_count
        FROM posts
        WHERE status = 'published'
        ORDER BY published_at DESC, created_at DESC
        LIMIT 20
      `)
    ]);
    
    // 格式化优惠券数据
    const formattedCoupons = await Promise.all(
      coupons.map(async (coupon) => {
        const stores = await dbService.getCouponStores(coupon.id);
        
        const formattedCoupon = {
          ...coupon,
          contentType: 'coupon', // 标记内容类型
          image_url: coupon.image_url || '/default-coupon.jpg',
          title_th_th: coupon.title_th_th || coupon.title_zh_cn || coupon.title,
          description_th_th: coupon.description_th_th || coupon.description_zh_cn || coupon.description,
          name: coupon.title,
          cover: coupon.image_url || '/default-coupon.jpg',
          image: coupon.image_url || '/default-coupon.jpg',
          original_price: coupon.original_price ? coupon.original_price.toString() : null,
          discount_price: coupon.discount_price ? coupon.discount_price.toString() : null,
          valid_from: coupon.valid_from instanceof Date ? coupon.valid_from.toISOString() : coupon.valid_from,
          valid_to: coupon.valid_to instanceof Date ? coupon.valid_to.toISOString() : coupon.valid_to,
          created_at: coupon.created_at instanceof Date ? coupon.created_at.toISOString() : coupon.created_at,
          updated_at: coupon.updated_at instanceof Date ? coupon.updated_at.toISOString() : coupon.updated_at,
          stores: stores,
          left: coupon.quantity - coupon.claimed_count,
          views: Math.floor(Math.random() * 1000) + 100,
          sortTime: coupon.created_at // 用于排序
        };
        
        const { enhanceCouponWithPricing } = require('../utils/couponPricing');
        return enhanceCouponWithPricing(formattedCoupon);
      })
    );
    
    // 格式化posts数据，按类型分离
    const videos = []
    const articles = []
    
    posts.rows.forEach(post => {
      const formattedPost = {
        ...post,
        // 确保多语言字段
        title_th_th: post.title_th_th || post.title_zh_cn || post.title,
        content_th_th: post.content_th_th || post.content_zh_cn || post.content,
        // 解析media_files JSON
        media_files: typeof post.media_files === 'string' 
          ? JSON.parse(post.media_files) 
          : post.media_files
      }
      
      // 根据type分类到videos或articles
      if (post.type === 'video') {
        videos.push(formattedPost)
      } else if (post.type === 'article') {
        articles.push(formattedPost)
      }
    })
    
    // 返回前端期望的格式（分离的数组）
    res.json({
      coupons: formattedCoupons,
      videos: videos,
      articles: articles,
      campaigns: []
    });
    
    console.log(`✅ 返回 ${formattedCoupons.length} 条优惠券 + ${videos.length} 条视频 + ${articles.length} 条文章`);
  } catch (error) {
    console.error('❌ Home feed error:', error);
    res.status(500).json({ error: 'Failed to load home feed' });
  }
});

module.exports = router;