const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const { dbService } = require('../storage.js');
const { ObjectStorageService } = require('../objectStorage.js');
const { translatePost } = require('../translate.js');
const { pickUserId } = require('../utils/safe');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;

// 管理员认证中间件
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: '缺少管理员认证token' 
    });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 验证是否为管理员token
    if (decoded.type !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: '需要管理员权限' 
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'token无效或已过期' 
    });
  }
};

// 初始化对象存储服务
const objectStorageService = new ObjectStorageService();

// 公开内容列表接口（仅显示已发布内容）
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = 'all',
      search = '',
      lang = 'zh'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建查询条件（强制仅显示已发布内容）
    const conditions = ['status = $1'];
    const params = ['published'];
    let paramIndex = 2;
    
    if (type !== 'all' && ['video', 'article'].includes(type)) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    
    if (search && search.trim()) {
      conditions.push(`(title ILIKE $${paramIndex++} OR content ILIKE $${paramIndex++})`);
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM posts ${whereClause}`;
    const countResult = await dbService.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // 根据语言参数动态计算多语言字段
    let titleField, contentField;
    switch(lang) {
      case 'en':
        titleField = 'COALESCE(title_en_us, title_zh_cn, title) as title_i18n';
        contentField = 'COALESCE(content_en_us, content_zh_cn, content) as content_i18n';
        break;
      case 'th':
        titleField = 'COALESCE(title_th_th, title_zh_cn, title) as title_i18n';
        contentField = 'COALESCE(content_th_th, content_zh_cn, content) as content_i18n';
        break;
      case 'zh':
      default:
        titleField = 'COALESCE(title_zh_cn, title) as title_i18n';
        contentField = 'COALESCE(content_zh_cn, content) as content_i18n';
        break;
    }
    
    // 获取数据
    const dataQuery = `
      SELECT 
        id, type, ${titleField}, ${contentField}, media_files, coupon_id,
        published_at, created_at, updated_at
      FROM posts 
      ${whereClause}
      ORDER BY published_at DESC, created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);
    
    const result = await dbService.query(dataQuery, params);
    
    res.json({
      success: true,
      data: {
        posts: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取公开内容列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取内容列表失赅',
      message: error.message
    });
  }
});

// =========================== 管理员接口 ===========================

// 管理员获取内容列表（支持全部状态和筛选）
router.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      type = 'all',
      search = ''
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建查询条件
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    if (status !== 'all' && ['draft', 'published', 'archived'].includes(status)) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    
    if (type !== 'all' && ['video', 'article'].includes(type)) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    
    if (search && search.trim()) {
      conditions.push(`(title ILIKE $${paramIndex++} OR content ILIKE $${paramIndex++})`);
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM posts ${whereClause}`;
    const countResult = await dbService.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // 获取数据（包含统计数据和活动信息）
    const dataQuery = `
      SELECT 
        p.id, p.type, p.title, p.content, p.media_files, p.status, p.coupon_id,
        p.published_at, p.created_at, p.updated_at,
        p.title_zh_cn, p.title_en_us, p.title_th_th,
        p.content_zh_cn, p.content_en_us, p.content_th_th,
        p.activity_id, p.cta_type, p.cta_text, p.cta_link,
        p.views_count, p.likes_count, p.comments_count,
        c.title as activity_name,
        c.title as activity_title,
        (SELECT COUNT(*) FROM post_conversions WHERE post_id = p.id) as conversions_count,
        CASE 
          WHEN p.views_count > 0 THEN 
            ROUND((SELECT COUNT(*)::numeric FROM post_conversions WHERE post_id = p.id) / p.views_count * 100, 2)
          ELSE 0
        END as conversion_rate
      FROM posts p
      LEFT JOIN coupons c ON p.activity_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);
    
    const result = await dbService.query(dataQuery, params);
    
    res.json({
      success: true,
      data: {
        posts: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('管理员获取内容列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取内容列表失败',
      message: error.message
    });
  }
});

// 管理员获取单个内容详情
router.get('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id, type, title, content, media_files, status, coupon_id,
        published_at, created_at, updated_at,
        title_zh_cn, title_en_us, title_th_th,
        content_zh_cn, content_en_us, content_th_th,
        activity_id, cta_type, cta_text, cta_link
      FROM posts 
      WHERE id = $1
    `;
    
    const result = await dbService.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '内容不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('获取内容详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取内容详情失败',
      message: error.message
    });
  }
});

// 创建新内容（管理员接口）
// 获取上传URL（管理员接口）
router.post('/admin/upload-url', authenticateAdmin, async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] 生成上传URL请求 - 用户:`, req.admin.email);
    
    // 返回直接上传端点，不再使用对象存储
    const objectId = require('crypto').randomUUID();
    const uploadInfo = {
      uploadURL: 'http://localhost:5000/api/storage/upload-direct',
      objectPath: `/objects/posts/${objectId}`,
      objectId: objectId
    };
    
    console.log(`[${new Date().toISOString()}] 上传URL生成成功:`, uploadInfo.objectPath);
    
    res.json({
      success: true,
      data: uploadInfo
    });
  } catch (error) {
    console.error('生成上传URL失败:', error);
    res.status(500).json({
      success: false,
      error: '生成上传URL失败',
      message: error.message
    });
  }
});

// 翻译内容（管理员接口）
router.post('/admin/translate', authenticateAdmin, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '标题不能为空'
      });
    }
    
    const translations = await translatePost(title, content || '');
    
    res.json({
      success: true,
      data: translations
    });
    
  } catch (error) {
    console.error('翻译内容失败:', error);
    res.status(500).json({
      success: false,
      error: '翻译失败',
      message: error.message
    });
  }
});

router.post('/admin', authenticateAdmin, async (req, res) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 收到创建内容请求:`, {
    body: req.body,
    filesCount: req.files ? req.files.length : 0,
    contentLength: req.get('Content-Length')
  });
  
  if (req.files && req.files.length > 0) {
    console.log(`[${new Date().toISOString()}] 上传的文件详情:`, req.files.map(f => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path
    })));
  }
  try {
    const {
      type,
      title,
      content,
      status = 'draft',
      coupon_id
    } = req.body;
    
    // 验证必需字段
    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: '内容类型和标题不能为空'
      });
    }
    
    if (!['video', 'article'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: '内容类型必须是 video 或 article'
      });
    }
    
    // 使用传入的对象路径作为媒体文件
    const mediaFiles = req.body.media_files || [];
    
    // 设置发布时间
    const publishedAt = status === 'published' ? 'NOW()' : null;
    
    // 先保存内容（不翻译）
    const query = `
      INSERT INTO posts (
        type, title, content, media_files, status, coupon_id,
        published_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 
        ${publishedAt || 'NULL'}, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      type, title, content, JSON.stringify(mediaFiles), status,
      coupon_id || null
    ];
    
    const result = await dbService.query(query, params);
    const createdPost = result.rows[0];
    
    // 异步翻译（不阻塞响应）
    setImmediate(async () => {
      try {
        console.log(`🌐 开始异步翻译post #${createdPost.id}...`);
        const translations = await translatePost(title, content || '');
        
        // 更新翻译结果
        await dbService.query(`
          UPDATE posts 
          SET title_zh_cn = $1, title_en_us = $2, title_th_th = $3,
              content_zh_cn = $4, content_en_us = $5, content_th_th = $6
          WHERE id = $7
        `, [
          translations.title_zh_cn || null,
          translations.title_en_us || null,
          translations.title_th_th || null,
          translations.content_zh_cn || null,
          translations.content_en_us || null,
          translations.content_th_th || null,
          createdPost.id
        ]);
        
        console.log(`✅ Post #${createdPost.id} 翻译完成`);
      } catch (error) {
        console.error(`⚠️  Post #${createdPost.id} 翻译失败:`, error.message);
      }
    });
    
    res.status(201).json({
      success: true,
      data: createdPost,
      message: '内容创建成功'
    });
    
  } catch (error) {
    console.error('创建内容失败:', error);
    res.status(500).json({
      success: false,
      error: '创建内容失败',
      message: error.message
    });
  }
});

// 更新内容（管理员接口）
router.put('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      title,
      content,
      status,
      coupon_id,
      // 活动绑定字段
      activity_id,
      cta_type,
      cta_text,
      cta_link
    } = req.body;
    
    // 检查内容是否存在
    const existingPost = await dbService.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (existingPost.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '内容不存在'
      });
    }
    
    // 处理媒体文件（现在使用对象路径）
    let mediaFiles = existingPost.rows[0].media_files || [];
    if (req.body.media_files && req.body.media_files.length > 0) {
      mediaFiles = req.body.media_files; // 直接使用传入的对象路径
    }
    
    // 构建更新语句（先不翻译）
    const updateFields = [];
    const params = [];
    let paramIndex = 1;
    
    if (type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      params.push(content);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(status);
      
      // 如果状态变为已发布，更新发布时间
      if (status === 'published' && existingPost.rows[0].published_at === null) {
        updateFields.push(`published_at = NOW()`);
      }
    }
    if (coupon_id !== undefined) {
      updateFields.push(`coupon_id = $${paramIndex++}`);
      params.push(coupon_id || null);
    }
    
    // 活动绑定字段 - 支持自动解析活动类型
    if (activity_id !== undefined) {
      updateFields.push(`activity_id = $${paramIndex++}`);
      params.push(activity_id || null);
      
      // 如果cta_type为null且有activity_id，自动设置为'coupon'（默认类型）
      if (activity_id && cta_type === null) {
        updateFields.push(`cta_type = $${paramIndex++}`);
        params.push('coupon');
      } else if (cta_type !== undefined) {
        updateFields.push(`cta_type = $${paramIndex++}`);
        params.push(cta_type || null);
      }
    } else if (cta_type !== undefined) {
      updateFields.push(`cta_type = $${paramIndex++}`);
      params.push(cta_type || null);
    }
    if (cta_text !== undefined) {
      updateFields.push(`cta_text = $${paramIndex++}`);
      params.push(cta_text || null);
    }
    if (cta_link !== undefined) {
      updateFields.push(`cta_link = $${paramIndex++}`);
      params.push(cta_link || null);
    }
    
    // 更新媒体文件
    updateFields.push(`media_files = $${paramIndex++}`);
    params.push(JSON.stringify(mediaFiles));
    
    updateFields.push(`updated_at = NOW()`);
    params.push(id);
    
    const query = `
      UPDATE posts 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;
    
    const result = await dbService.query(query, params);
    const updatedPost = result.rows[0];
    
    // 如果标题或内容有更新，异步触发翻译
    if (title !== undefined || content !== undefined) {
      setImmediate(async () => {
        try {
          const titleToTranslate = updatedPost.title;
          const contentToTranslate = updatedPost.content || '';
          
          console.log(`🌐 开始异步翻译post #${id}...`);
          const translations = await translatePost(titleToTranslate, contentToTranslate);
          
          // 更新翻译结果
          await dbService.query(`
            UPDATE posts 
            SET title_zh_cn = $1, title_en_us = $2, title_th_th = $3,
                content_zh_cn = $4, content_en_us = $5, content_th_th = $6
            WHERE id = $7
          `, [
            translations.title_zh_cn || null,
            translations.title_en_us || null,
            translations.title_th_th || null,
            translations.content_zh_cn || null,
            translations.content_en_us || null,
            translations.content_th_th || null,
            id
          ]);
          
          console.log(`✅ Post #${id} 翻译完成`);
        } catch (error) {
          console.error(`⚠️  Post #${id} 翻译失败:`, error.message);
        }
      });
    }
    
    res.json({
      success: true,
      data: updatedPost,
      message: '内容更新成功'
    });
    
  } catch (error) {
    console.error('更新内容失败:', error);
    res.status(500).json({
      success: false,
      error: '更新内容失败',
      message: error.message
    });
  }
});

// 删除内容（管理员接口）
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取内容信息以便清理文件
    const existingPost = await dbService.query('SELECT media_files FROM posts WHERE id = $1', [id]);
    if (existingPost.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '内容不存在'
      });
    }
    
    // 删除数据库记录
    await dbService.query('DELETE FROM posts WHERE id = $1', [id]);
    
    // 异步清理关联的媒体文件
    const mediaFiles = existingPost.rows[0].media_files || [];
    if (Array.isArray(mediaFiles)) {
      for (const file of mediaFiles) {
        if (file.filename) {
          try {
            await fs.unlink(path.join('uploads/posts/', file.filename));
          } catch (error) {
            console.error('清理文件失败:', file.filename, error);
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: '内容删除成功'
    });
    
  } catch (error) {
    console.error('删除内容失败:', error);
    res.status(500).json({
      success: false,
      error: '删除内容失败',
      message: error.message
    });
  }
});

// 批量更新状态（管理员接口）
router.patch('/admin/batch/status', authenticateAdmin, async (req, res) => {
  try {
    const { ids, status } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids必须是非空数组'
      });
    }
    
    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: '无效的状态值'
      });
    }
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    let query = `UPDATE posts SET status = $${ids.length + 1}, updated_at = NOW()`;
    
    // 如果状态为已发布，同时更新发布时间
    if (status === 'published') {
      query += `, published_at = COALESCE(published_at, NOW())`;
    }
    
    query += ` WHERE id IN (${placeholders}) RETURNING id, title, status`;
    
    const result = await dbService.query(query, [...ids, status]);
    
    res.json({
      success: true,
      data: result.rows,
      message: `成功更新${result.rows.length}条内容状态`
    });
    
  } catch (error) {
    console.error('批量更新状态失败:', error);
    res.status(500).json({
      success: false,
      error: '批量更新状态失败',
      message: error.message
    });
  }
});

// 批量删除内容（管理员接口）
router.delete('/admin/batch', authenticateAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids必须是非空数组'
      });
    }
    
    // 获取所有内容的媒体文件信息（用于清理）
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const selectQuery = `SELECT id, title, media_files FROM posts WHERE id IN (${placeholders})`;
    const selectResult = await dbService.query(selectQuery, ids);
    
    // 删除数据库记录
    const deleteQuery = `DELETE FROM posts WHERE id IN (${placeholders}) RETURNING id, title`;
    const deleteResult = await dbService.query(deleteQuery, ids);
    
    // 异步清理关联的媒体文件
    for (const post of selectResult.rows) {
      const mediaFiles = post.media_files || [];
      if (Array.isArray(mediaFiles)) {
        for (const file of mediaFiles) {
          if (file.filename) {
            try {
              await fs.unlink(path.join('uploads/posts/', file.filename));
            } catch (error) {
              console.error('清理文件失败:', file.filename, error);
            }
          }
        }
      }
    }
    
    res.json({
      success: true,
      data: deleteResult.rows,
      message: `成功删除${deleteResult.rows.length}条内容`
    });
    
  } catch (error) {
    console.error('批量删除失败:', error);
    res.status(500).json({
      success: false,
      error: '批量删除失败',
      message: error.message
    });
  }
});

// 获取视频内容流（特殊路由，必须在/:id之前）
router.get('/video-feed', async (req, res) => {
  try {
    const { limit = 20, page = 1, lang = 'zh-cn' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const query = `
      SELECT 
        id, type, title, content, media_files, coupon_id,
        published_at, created_at, updated_at,
        title_zh_cn, title_en_us, title_th_th,
        content_zh_cn, content_en_us, content_th_th,
        poster, likes_count, comments_count
      FROM posts 
      WHERE type = 'video' AND status = 'published'
      ORDER BY published_at DESC, created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await dbService.query(query, [parseInt(limit), offset]);
    
    // 多语言字段选择函数
    const getLocalizedField = (post, fieldPrefix, userLang) => {
      const normalizedLang = userLang.toLowerCase().replace('_', '-');
      switch(normalizedLang) {
        case 'en-us':
          return post[`${fieldPrefix}_en_us`] || post[`${fieldPrefix}_zh_cn`] || post[fieldPrefix] || '';
        case 'th-th':
          return post[`${fieldPrefix}_th_th`] || post[`${fieldPrefix}_zh_cn`] || post[fieldPrefix] || '';
        default: // 'zh-cn'
          return post[`${fieldPrefix}_zh_cn`] || post[fieldPrefix] || '';
      }
    };
    
    // 处理media_files字段，确保video内容有适当的封面
    const videos = result.rows.map(post => {
      let mediaFiles = [];
      try {
        mediaFiles = Array.isArray(post.media_files) ? post.media_files : 
                   typeof post.media_files === 'string' ? JSON.parse(post.media_files) : [];
      } catch (e) {
        mediaFiles = [];
      }
      
      // 查找视频封面
      const coverImage = mediaFiles.find(file => file.type === 'image' || file.type === 'cover');
      const videoFile = mediaFiles.find(file => file.type === 'video');
      
      return {
        id: post.id,
        title: getLocalizedField(post, 'title', lang) || '无标题视频',
        content: getLocalizedField(post, 'content', lang) || '',
        // 保留所有多语言字段供前端使用
        title_zh_cn: post.title_zh_cn,
        title_en_us: post.title_en_us,
        title_th_th: post.title_th_th,
        content_zh_cn: post.content_zh_cn,
        content_en_us: post.content_en_us,
        content_th_th: post.content_th_th,
        cover: coverImage?.url || null,
        poster: coverImage?.url || null,
        video_url: videoFile?.url || null,
        published_at: post.published_at,
        created_at: post.created_at,
        likes: post.likes_count || 0,
        comments: post.comments_count || 0
      };
    });
    
    res.json({
      success: true,
      data: videos
    });
    
  } catch (error) {
    console.error('获取视频流失败:', error);
    res.status(500).json({
      success: false,
      error: '获取视频流失败',
      message: error.message
    });
  }
});

// 记录内容浏览量（公开接口）
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, session_id } = req.body;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // 检查24小时内是否已记录（防止重复计数）
    const checkQuery = `
      SELECT id FROM post_views 
      WHERE post_id = $1 
        AND (user_id = $2 OR session_id = $3)
        AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `;
    const checkResult = await dbService.query(checkQuery, [id, user_id || null, session_id || null]);
    
    if (checkResult.rows.length === 0) {
      // 记录浏览
      await dbService.query(
        `INSERT INTO post_views (post_id, user_id, session_id, ip_address) VALUES ($1, $2, $3, $4)`,
        [id, user_id || null, session_id || null, ip_address]
      );
      
      // 更新浏览计数
      await dbService.query(
        `UPDATE posts SET views_count = views_count + 1 WHERE id = $1`,
        [id]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('记录浏览量失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 记录视频播放统计（公开接口）
router.post('/video-play-stat', async (req, res) => {
  try {
    const { 
      post_id, 
      user_id, 
      session_id, 
      play_duration, 
      video_duration, 
      completion_rate, 
      is_completed,
      source = 'feed'
    } = req.body;
    
    // 插入播放统计
    await dbService.query(
      `INSERT INTO video_play_stats 
        (post_id, user_id, session_id, play_duration, video_duration, completion_rate, is_completed, source) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        post_id, 
        user_id || null, 
        session_id || null, 
        play_duration, 
        video_duration, 
        completion_rate, 
        is_completed,
        source
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('记录视频播放统计失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取相关视频推荐列表
router.get('/:id/related-videos', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 查询相关视频：
    // 1. 只返回视频类型
    // 2. 排除当前视频
    // 3. 按置顶 > 排序权重 > 热度 > 发布时间排序
    const query = `
      SELECT 
        p.id, p.type, p.title, p.content, p.media_files, p.poster,
        p.published_at, p.created_at,
        p.title_zh_cn, p.title_en_us, p.title_th_th,
        p.content_zh_cn, p.content_en_us, p.content_th_th,
        p.views_count, p.likes_count, p.comments_count, 
        p.shares_count, p.favorites_count,
        p.is_pinned, p.sort_order, p.hot_score,
        p.author_id,
        a.display_name as author_display_name,
        a.avatar as author_avatar,
        a.role as author_role
      FROM posts p
      LEFT JOIN admins a ON p.author_id = a.id
      WHERE p.status = 'published' 
        AND p.type = 'video'
        AND p.id != $1
      ORDER BY 
        p.is_pinned DESC,
        p.sort_order DESC,
        p.hot_score DESC,
        p.published_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await dbService.query(query, [id, parseInt(limit), offset]);
    
    // 整理数据
    const videos = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      media_files: row.media_files,
      poster: row.poster,
      title_zh_cn: row.title_zh_cn,
      title_en_us: row.title_en_us,
      title_th_th: row.title_th_th,
      content_zh_cn: row.content_zh_cn,
      content_en_us: row.content_en_us,
      content_th_th: row.content_th_th,
      views_count: row.views_count,
      likes_count: row.likes_count,
      comments_count: row.comments_count,
      shares_count: row.shares_count,
      favorites_count: row.favorites_count,
      is_pinned: row.is_pinned,
      hot_score: row.hot_score,
      published_at: row.published_at,
      author: {
        id: row.author_id,
        display_name: row.author_display_name || 'ProDee',
        is_official: row.author_role === 'super_admin',
        avatar: row.author_avatar || '',
        role: row.author_role || 'super_admin'
      }
    }));
    
    res.json({
      success: true,
      data: videos,
      page: parseInt(page),
      limit: parseInt(limit),
      total: videos.length
    });
  } catch (error) {
    console.error('获取相关视频失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 公开获取单个内容详情（仅显示已发布内容）
// 放在最后以避免与admin路由冲突
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        p.id, p.type, p.title, p.content, p.media_files, p.coupon_id,
        p.published_at, p.created_at, p.updated_at,
        p.title_zh_cn, p.title_en_us, p.title_th_th,
        p.content_zh_cn, p.content_en_us, p.content_th_th,
        p.activity_id, p.cta_type, p.cta_text, p.cta_link,
        p.views_count, p.likes_count, p.comments_count, 
        p.shares_count, p.favorites_count,
        p.author_id,
        a.display_name as author_display_name,
        a.avatar as author_avatar,
        a.role as author_role
      FROM posts p
      LEFT JOIN admins a ON p.author_id = a.id
      WHERE p.id = $1 AND p.status = 'published'
    `;
    
    const result = await dbService.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '内容不存在或未发布'
      });
    }
    
    const post = result.rows[0];
    
    // 整理作者信息
    const author = {
      id: post.author_id,
      display_name: post.author_display_name || 'ProDee',
      is_official: post.author_role === 'super_admin',
      avatar: post.author_avatar || '',
      role: post.author_role || 'super_admin'
    };
    
    // 移除临时字段
    delete post.author_display_name;
    delete post.author_avatar;
    delete post.author_role;
    
    // 添加作者对象
    post.author = author;
    
    // 如果用户已登录，查询互动状态
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        // 查询点赞状态
        const likeResult = await dbService.query(
          `SELECT id FROM post_likes WHERE user_id = $1 AND post_id = $2`,
          [userId, id]
        );
        
        // 查询收藏状态
        const favoriteResult = await dbService.query(
          `SELECT id FROM post_favorites WHERE user_id = $1 AND post_id = $2`,
          [userId, id]
        );
        
        post.user_liked = likeResult.rows.length > 0;
        post.user_favorited = favoriteResult.rows.length > 0;
      } catch (err) {
        // Token无效或过期，忽略
        post.user_liked = false;
        post.user_favorited = false;
      }
    } else {
      post.user_liked = false;
      post.user_favorited = false;
    }
    
    res.json({
      success: true,
      data: post
    });
    
  } catch (error) {
    console.error('获取内容详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取内容详情失败',
      message: error.message
    });
  }
});

// ========================
// 点赞和评论相关API (已废弃，使用下方带认证的版本)
// ========================

/* 旧版API已全部注释，使用下方带认证的新版API

router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, content, parent_id } = req.body;
    
    if (!user_id || !content) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }
    
    // 先保存评论（不翻译）
    const insertResult = await dbService.query(
      `INSERT INTO post_comments (user_id, post_id, parent_id, content, status) 
       VALUES ($1, $2, $3, $4, 'approved') RETURNING *`,
      [user_id, id, parent_id || null, content]
    );
    
    const commentId = insertResult.rows[0].id;
    
    // 更新评论计数（只统计顶层评论）
    if (!parent_id) {
      await dbService.query(
        `UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1`,
        [id]
      );
    }
    
    // 异步翻译评论（不阻塞响应）
    setImmediate(async () => {
      try {
        console.log(`🌐 开始异步翻译评论 #${commentId}...`);
        const translations = await translatePost('', content.trim());
        
        // 更新翻译结果
        await dbService.query(`
          UPDATE post_comments 
          SET content_zh_cn = $1, content_en_us = $2, content_th_th = $3
          WHERE id = $4
        `, [
          translations.content_zh_cn || null,
          translations.content_en_us || null,
          translations.content_th_th || null,
          commentId
        ]);
        
        console.log(`✅ 评论 #${commentId} 翻译完成`);
      } catch (error) {
        console.error(`⚠️  评论 #${commentId} 翻译失败:`, error.message);
      }
    });
    
    res.json({ success: true, data: insertResult.rows[0] });
  } catch (error) {
    console.error('发表评论失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取评论列表（楼中楼模式）
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 获取顶层评论
    const topQuery = `
      SELECT c.*, u.nickname, u.avatar 
      FROM post_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1 AND c.status = 'approved' AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const topResult = await dbService.query(topQuery, [id, parseInt(limit), offset]);
    const topComments = topResult.rows;
    
    // 获取所有回复（楼中楼）
    if (topComments.length > 0) {
      const commentIds = topComments.map(c => c.id);
      const repliesQuery = `
        SELECT c.*, u.nickname, u.avatar 
        FROM post_comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.parent_id = ANY($1) AND c.status = 'approved'
        ORDER BY c.created_at ASC
      `;
      
      const repliesResult = await dbService.query(repliesQuery, [commentIds]);
      
      // 组装评论树
      const repliesMap = {};
      repliesResult.rows.forEach(reply => {
        if (!repliesMap[reply.parent_id]) {
          repliesMap[reply.parent_id] = [];
        }
        repliesMap[reply.parent_id].push(reply);
      });
      
      topComments.forEach(comment => {
        comment.replies = repliesMap[comment.id] || [];
      });
    }
    
    res.json({ success: true, data: topComments });
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除评论（管理员接口）
router.delete('/admin/comments/:comment_id', authenticateAdmin, async (req, res) => {
  try {
    const { comment_id } = req.params;
    
    // 获取评论信息
    const commentResult = await dbService.query(
      `SELECT post_id, parent_id FROM post_comments WHERE id = $1`,
      [comment_id]
    );
    
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '评论不存在' });
    }
    
    const comment = commentResult.rows[0];
    
    // 删除评论
    await dbService.query(`DELETE FROM post_comments WHERE id = $1`, [comment_id]);
    
    // 如果是顶层评论，更新评论计数
    if (!comment.parent_id) {
      await dbService.query(
        `UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1`,
        [comment.post_id]
      );
    }
    
    res.json({ success: true, message: '评论已删除' });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================
// 转化率追踪相关API
// ========================

// 记录转化（从内容到领券/购买）
router.post('/:id/conversion', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, activity_id, conversion_type } = req.body;
    
    if (!user_id || !conversion_type) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }
    
    // 记录转化
    await dbService.query(
      `INSERT INTO post_conversions (user_id, post_id, activity_id, conversion_type) 
       VALUES ($1, $2, $3, $4)`,
      [user_id, id, activity_id || null, conversion_type]
    );
    
    res.json({ success: true, message: '转化记录成功' });
  } catch (error) {
    console.error('记录转化失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取内容转化率统计（管理员接口）
router.get('/admin/:id/analytics', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取基础统计
    const statsQuery = `
      SELECT 
        views_count,
        likes_count,
        comments_count,
        (SELECT COUNT(*) FROM post_conversions WHERE post_id = $1) as conversions_count
      FROM posts 
      WHERE id = $1
    `;
    
    const statsResult = await dbService.query(statsQuery, [id]);
    
    if (statsResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '内容不存在' });
    }
    
    const stats = statsResult.rows[0];
    
    // 计算转化率
    const conversionRate = stats.views_count > 0 
      ? ((stats.conversions_count / stats.views_count) * 100).toFixed(2)
      : 0;
    
    // 获取转化类型分布
    const conversionTypesQuery = `
      SELECT conversion_type, COUNT(*) as count
      FROM post_conversions
      WHERE post_id = $1
      GROUP BY conversion_type
    `;
    
    const typesResult = await dbService.query(conversionTypesQuery, [id]);
    
    res.json({
      success: true,
      data: {
        views: parseInt(stats.views_count) || 0,
        likes: parseInt(stats.likes_count) || 0,
        comments: parseInt(stats.comments_count) || 0,
        conversions: parseInt(stats.conversions_count) || 0,
        conversionRate: parseFloat(conversionRate),
        conversionTypes: typesResult.rows
      }
    });
  } catch (error) {
    console.error('获取分析数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

*/ // 旧版API注释结束

// 用户认证中间件（简化版）
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'user') {
      return res.status(403).json({ success: false, error: '用户认证失败' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: '登录信息无效' });
  }
};

// 点赞视频/文章
router.post('/:id/like', authenticateUser, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    console.log(`👍 点赞请求: 用户${userId} -> 内容${postId}`);

    // 检查内容是否存在
    const postExists = await dbService.checkPostExists(postId);
    if (!postExists) {
      console.log(`❌ 内容${postId}不存在`);
      return res.status(404).json({ success: false, error: '内容不存在' });
    }

    // 检查是否已经点赞
    const existingLike = await dbService.findPostLike(userId, postId);
    
    if (existingLike) {
      // 已经点赞，不重复点赞
      console.log(`ℹ️ 用户${userId}已点赞内容${postId}，返回已点赞状态`);
      return res.json({ 
        success: true, 
        liked: true,
        message: '已经点赞过了' 
      });
    }

    // 添加点赞
    await dbService.addPostLike(userId, postId);
    await dbService.incrementLikesCount(postId);
    console.log(`❤️ 点赞成功: 用户${userId} -> 内容${postId}`);
    
    return res.json({ 
      success: true, 
      liked: true,
      message: '点赞成功' 
    });
  } catch (error) {
    console.error('点赞操作失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// 取消点赞
router.delete('/:id/like', authenticateUser, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    console.log(`💔 取消点赞请求: 用户${userId} -> 内容${postId}`);

    // 检查内容是否存在
    const postExists = await dbService.checkPostExists(postId);
    if (!postExists) {
      console.log(`❌ 内容${postId}不存在`);
      return res.status(404).json({ success: false, error: '内容不存在' });
    }

    // 检查是否已经点赞
    const existingLike = await dbService.findPostLike(userId, postId);
    
    if (!existingLike) {
      console.log(`⚠️ 用户${userId}未点赞内容${postId}`);
      return res.status(400).json({ success: false, error: '您还未点赞' });
    }

    // 取消点赞
    await dbService.removePostLike(userId, postId);
    await dbService.decrementLikesCount(postId);
    console.log(`✅ 取消点赞成功: 用户${userId} -> 内容${postId}`);
    
    return res.json({ 
      success: true, 
      liked: false,
      message: '取消点赞成功' 
    });
  } catch (error) {
    console.error('取消点赞失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// 获取内容的点赞状态
router.get('/:id/like-status', authenticateUser, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    const liked = await dbService.checkUserLikedPost(userId, postId);
    const likesCount = await dbService.getPostLikesCount(postId);

    res.json({ 
      success: true, 
      liked: !!liked,
      likesCount: likesCount || 0
    });
  } catch (error) {
    console.error('获取点赞状态失败:', error);
    res.status(500).json({ success: false, error: '获取状态失败' });
  }
});

// 收藏内容
router.post('/:id/favorite', authenticateUser, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    // 检查是否已收藏
    const existingFavorite = await dbService.query(
      `SELECT id FROM post_favorites WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );

    if (existingFavorite.rows.length > 0) {
      return res.status(400).json({ success: false, error: '已经收藏过了' });
    }

    // 添加收藏
    await dbService.query(
      `INSERT INTO post_favorites (user_id, post_id, created_at) VALUES ($1, $2, NOW())`,
      [userId, postId]
    );

    // 更新收藏数量
    await dbService.query(
      `UPDATE posts SET favorites_count = favorites_count + 1 WHERE id = $1`,
      [postId]
    );

    res.json({ 
      success: true, 
      favorited: true,
      message: '收藏成功' 
    });
  } catch (error) {
    console.error('收藏失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// 取消收藏
router.delete('/:id/favorite', authenticateUser, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    // 删除收藏记录
    const deleteResult = await dbService.query(
      `DELETE FROM post_favorites WHERE user_id = $1 AND post_id = $2 RETURNING id`,
      [userId, postId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '未找到收藏记录' });
    }

    // 更新收藏数量
    await dbService.query(
      `UPDATE posts SET favorites_count = GREATEST(favorites_count - 1, 0) WHERE id = $1`,
      [postId]
    );

    res.json({ 
      success: true, 
      favorited: false,
      message: '取消收藏成功' 
    });
  } catch (error) {
    console.error('取消收藏失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// 分享统计
router.post('/:id/share', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    // 更新分享数量
    await dbService.query(
      `UPDATE posts SET shares_count = shares_count + 1 WHERE id = $1`,
      [postId]
    );

    res.json({ 
      success: true,
      message: '分享统计成功' 
    });
  } catch (error) {
    console.error('分享统计失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// 添加评论
router.post('/:id/comments', authenticateUser, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }
    
    const { content, parentId = null } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: '评论内容不能为空' });
    }

    if (content.length > 500) {
      return res.status(400).json({ success: false, error: '评论内容不能超过500字符' });
    }

    // 检查内容是否存在
    const postExists = await dbService.checkPostExists(postId);
    if (!postExists) {
      return res.status(404).json({ success: false, error: '内容不存在' });
    }

    // 如果是回复，检查父评论是否存在
    if (parentId) {
      const parentExists = await dbService.checkCommentExists(parentId);
      if (!parentExists) {
        return res.status(404).json({ success: false, error: '回复的评论不存在' });
      }
    }

    // 先保存评论（不翻译）
    const query = `
      INSERT INTO post_comments (user_id, post_id, content, parent_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id
    `;
    
    const result = await dbService.query(query, [
      userId,
      postId,
      content.trim(),
      parentId || null
    ]);

    const commentId = result.rows[0].id;

    // 更新评论数量
    await dbService.incrementCommentsCount(postId);

    // 异步翻译评论（不阻塞响应）
    setImmediate(async () => {
      try {
        console.log(`🌐 开始异步翻译评论 #${commentId}...`);
        const translations = await translatePost('', content.trim());
        
        // 更新翻译结果
        await dbService.query(`
          UPDATE post_comments 
          SET content_zh_cn = $1, content_en_us = $2, content_th_th = $3
          WHERE id = $4
        `, [
          translations.content_zh_cn || null,
          translations.content_en_us || null,
          translations.content_th_th || null,
          commentId
        ]);
        
        console.log(`✅ 评论 #${commentId} 翻译完成`);
      } catch (error) {
        console.error(`⚠️  评论 #${commentId} 翻译失败:`, error.message);
      }
    });

    res.json({ 
      success: true, 
      commentId,
      message: '评论发布成功' 
    });
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({ success: false, error: '评论发布失败' });
  }
});

// 获取内容的评论列表
router.get('/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const comments = await dbService.getPostComments(postId, {
      limit: parseInt(limit),
      offset
    });

    res.json({ 
      success: true, 
      data: comments,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ success: false, error: '获取评论失败' });
  }
});

// 删除评论（仅作者可删除）
router.delete('/comments/:commentId', authenticateUser, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    // 检查评论是否存在且属于当前用户
    const comment = await dbService.getCommentById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: '评论不存在' });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({ success: false, error: '只能删除自己的评论' });
    }

    // 删除评论
    await dbService.deleteComment(commentId);
    
    // 更新评论数量
    await dbService.decrementCommentsCount(comment.post_id);

    res.json({ success: true, message: '评论删除成功' });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ success: false, error: '删除评论失败' });
  }
});

// 批量绑定活动/CTA（管理员功能）
router.post('/bind-activity', authenticateAdmin, async (req, res) => {
  try {
    const { post_ids, activity_id, cta_type, cta_text, cta_link } = req.body;
    
    if (!post_ids || !Array.isArray(post_ids) || post_ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供要绑定的内容ID列表' });
    }
    
    // 构建更新SQL
    const query = `
      UPDATE posts 
      SET 
        activity_id = $1,
        cta_type = $2,
        cta_text = $3,
        cta_link = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($5::int[])
    `;
    
    await dbService.query(query, [
      activity_id || null,
      cta_type || null,
      cta_text || null,
      cta_link || null,
      post_ids
    ]);
    
    res.json({ 
      success: true, 
      message: `成功绑定 ${post_ids.length} 个内容` 
    });
  } catch (error) {
    console.error('绑定活动失败:', error);
    res.status(500).json({ success: false, error: '绑定活动失败' });
  }
});

// 批量取消绑定活动/CTA（管理员功能）
router.post('/unbind-activity', authenticateAdmin, async (req, res) => {
  try {
    const { post_ids } = req.body;
    
    if (!post_ids || !Array.isArray(post_ids) || post_ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供要取消绑定的内容ID列表' });
    }
    
    // 清空CTA相关字段
    const query = `
      UPDATE posts 
      SET 
        activity_id = NULL,
        cta_type = NULL,
        cta_text = NULL,
        cta_link = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1::int[])
    `;
    
    await dbService.query(query, [post_ids]);
    
    res.json({ 
      success: true, 
      message: `成功取消绑定 ${post_ids.length} 个内容` 
    });
  } catch (error) {
    console.error('取消绑定失败:', error);
    res.status(500).json({ success: false, error: '取消绑定失败' });
  }
});

module.exports = router;