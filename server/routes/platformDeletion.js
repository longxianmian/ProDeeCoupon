const express = require('express');
const router = express.Router();
const { parseSignedRequest } = require('../utils/metaSignedRequest');

// 创建删除任务占位函数（TODO: 替换为真实实现）
async function createDeletionJob(payload) {
  const jobId = 'J' + Date.now();
  console.log('🔧 [创建删除任务]', jobId, payload);
  // TODO: 保存到数据库
  // 建议创建表：deletion_jobs (id, provider, user_id, payload, status, created_at, completed_at)
  return jobId;
}

/**
 * POST /api/meta/deletion
 * Meta (Facebook/Instagram) 数据删除回调
 * 文档：https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
router.post('/meta/deletion', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { signed_request } = req.body || {};

    if (!signed_request) {
      console.warn('⚠️ Meta删除回调缺少signed_request');
      return res.status(400).json({ 
        error: 'NO_SIGNED_REQUEST' 
      });
    }

    // 获取Meta App Secret
    const FB_APP_SECRET = process.env.FB_APP_SECRET;
    
    if (!FB_APP_SECRET) {
      console.error('❌ FB_APP_SECRET环境变量未配置');
      return res.status(500).json({ 
        error: 'SERVER_CONFIG_ERROR' 
      });
    }

    // 验证签名并解析payload
    let payload;
    try {
      payload = parseSignedRequest(signed_request, FB_APP_SECRET);
      console.log('✅ Meta删除回调签名验证成功:', payload);
    } catch (err) {
      console.error('❌ Meta签名验证失败:', err.message);
      return res.status(400).json({ 
        error: 'INVALID_REQUEST',
        message: err.message 
      });
    }

    // 创建删除任务
    const jobId = await createDeletionJob({
      provider: 'meta',
      user_id: payload.user_id,
      issued_at: payload.issued_at,
      algorithm: payload.algorithm,
      payload: payload
    });

    // 构建响应URL
    const APP_BASE_URL = process.env.APP_BASE_URL || 'https://prodee.replit.app';
    
    const response = {
      url: `${APP_BASE_URL}/data-deletion?job=${jobId}`,
      confirmation_code: String(jobId),
      status_url: `${APP_BASE_URL}/data-deletion?job=${jobId}`
    };

    console.log('✅ Meta删除任务已创建:', jobId);
    
    return res.json(response);
  } catch (err) {
    console.error('❌ Meta删除回调错误:', err);
    return res.status(400).json({ 
      error: 'INVALID_REQUEST' 
    });
  }
});

/**
 * POST /api/tiktok/deletion
 * TikTok 删除/撤销授权回调
 * 注：TikTok的具体规范请参考其开放平台文档
 */
router.post('/tiktok/deletion', express.json(), async (req, res) => {
  try {
    console.log('📱 收到TikTok删除回调:', req.body);

    // TODO: 根据TikTok具体规范验证请求
    // 可能需要验证签名、时间戳等
    
    // 创建删除任务
    const jobId = await createDeletionJob({
      provider: 'tiktok',
      payload: req.body
    });

    // 构建响应
    const APP_BASE_URL = process.env.APP_BASE_URL || 'https://prodee.replit.app';
    
    const response = {
      ok: true,
      jobId: jobId,
      status_url: `${APP_BASE_URL}/data-deletion?job=${jobId}`
    };

    console.log('✅ TikTok删除任务已创建:', jobId);
    
    return res.json(response);
  } catch (err) {
    console.error('❌ TikTok删除回调错误:', err);
    return res.status(400).json({ 
      error: 'INVALID_REQUEST' 
    });
  }
});

module.exports = router;
