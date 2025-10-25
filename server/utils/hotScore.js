/**
 * 热度计算工具
 * 根据用户的需求：按天统计点赞、评论、分享、播放次数计算热度
 */

const { q } = require('../db/query');

/**
 * 计算单个内容的热度分数
 * @param {number} postId - 内容ID
 * @param {number} days - 统计天数，默认1天
 * @returns {Promise<number>} 热度分数
 */
async function calculateHotScore(postId, days = 1) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // 获取指定天数内的互动数据
    const statsQuery = `
      SELECT 
        -- 点赞数（权重1）
        COALESCE((SELECT COUNT(*) FROM post_likes WHERE post_id = $1 AND created_at >= $2), 0) as likes,
        -- 评论数（权重2）
        COALESCE((SELECT COUNT(*) FROM post_comments WHERE post_id = $1 AND created_at >= $2), 0) as comments,
        -- 分享数（权重3）
        p.shares_count as shares,
        -- 收藏数（权重1.5）
        COALESCE((SELECT COUNT(*) FROM post_favorites WHERE post_id = $1 AND created_at >= $2), 0) as favorites,
        -- 视频播放数（权重0.1）
        COALESCE((SELECT COUNT(*) FROM video_play_stats WHERE post_id = $1 AND created_at >= $2), 0) as plays,
        -- 平均完播率（加成系数）
        COALESCE((SELECT AVG(completion_rate) FROM video_play_stats WHERE post_id = $1 AND created_at >= $2), 0) as avg_completion
      FROM posts p
      WHERE p.id = $1
    `;
    
    const result = await q(statsQuery, [postId, cutoffDate]);
    
    if (result.rows.length === 0) return 0;
    
    const stats = result.rows[0];
    
    // 热度公式：点赞*1 + 评论*2 + 分享*3 + 收藏*1.5 + 播放*0.1 + 完播率加成
    const hotScore = 
      (parseInt(stats.likes) || 0) * 1 +
      (parseInt(stats.comments) || 0) * 2 +
      (parseInt(stats.shares) || 0) * 3 +
      (parseInt(stats.favorites) || 0) * 1.5 +
      (parseInt(stats.plays) || 0) * 0.1 +
      (parseFloat(stats.avg_completion) || 0) * 2;
    
    return parseFloat(hotScore.toFixed(2));
  } catch (error) {
    console.error('计算热度分数失败:', error);
    return 0;
  }
}

/**
 * 批量更新所有内容的热度分数（定时任务用）
 * @param {number} days - 统计天数
 */
async function updateAllHotScores(days = 1) {
  try {
    // 获取所有已发布的内容
    const postsResult = await q(
      `SELECT id FROM posts WHERE status = 'published'`
    );
    
    const posts = postsResult.rows;
    let updated = 0;
    
    for (const post of posts) {
      const hotScore = await calculateHotScore(post.id, days);
      await q(
        `UPDATE posts SET hot_score = $1, updated_at = NOW() WHERE id = $2`,
        [hotScore, post.id]
      );
      updated++;
    }
    
    console.log(`✅ 热度分数更新完成：${updated} 条内容`);
    return updated;
  } catch (error) {
    console.error('批量更新热度分数失败:', error);
    throw error;
  }
}

/**
 * 获取内容排序（置顶 > 排序权重 > 热度 > 发布时间）
 * @param {Object} options - 查询选项
 * @returns {string} SQL排序字符串
 */
function getContentOrderBy(options = {}) {
  const { type = null } = options;
  
  // 排序逻辑：
  // 1. 置顶内容优先（is_pinned DESC）
  // 2. 自定义排序权重（sort_order DESC）
  // 3. 热度分数（hot_score DESC）
  // 4. 发布时间（published_at DESC）
  
  let orderBy = `
    is_pinned DESC,
    sort_order DESC,
    hot_score DESC,
    published_at DESC
  `;
  
  return orderBy;
}

module.exports = {
  calculateHotScore,
  updateAllHotScores,
  getContentOrderBy
};
