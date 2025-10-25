const { drizzle } = require('drizzle-orm/node-postgres')
const { Pool } = require('pg')
const schema = require('../shared/schema')

// 数据库连接池配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// 创建Drizzle数据库实例
const db = drizzle(pool, { schema })

// 导出连接池用于健康检查等


// 类型导出


// 导入必要的Drizzle查询构建器
const { eq, inArray, count, sql, and, desc } = require('drizzle-orm')

// 数据库操作工具类
class DatabaseService {
  constructor(database) {
    this.database = database
  }

  // 用户相关操作
  async createUser(userData) {
    return await this.database.insert(schema.users).values(userData).returning()
  }

  async getUserByLineId(lineId) {
    return await this.database
      .select()
      .from(schema.users)
      .where(eq(schema.users.line_id, lineId))
      .limit(1)
  }

  async updateUser(userId, userData) {
    const [updatedUser] = await this.database
      .update(schema.users)
      .set(userData)
      .where(eq(schema.users.id, userId))
      .returning()
    return updatedUser
  }

  // 门店相关操作
  async createStore(storeData) {
    return await this.database.insert(schema.stores).values(storeData).returning()
  }

  async getStoresByIds(storeIds) {
    return await this.database
      .select()
      .from(schema.stores)
      .where(inArray(schema.stores.id, storeIds))
  }

  async getAllStores(filters) {
    let query = this.database.select().from(schema.stores)
    
    if (filters && filters.status) {
      query = query.where(eq(schema.stores.status, filters.status))
    }
    
    // Note: For search and city filters, we'd need to use LIKE or ILIKE
    // This simplified version returns all stores
    return await query
  }

  async getStoreById(storeId) {
    return await this.database
      .select()
      .from(schema.stores)
      .where(eq(schema.stores.id, storeId))
      .limit(1)
  }

  async updateStore(storeId, storeData) {
    const [updatedStore] = await this.database
      .update(schema.stores)
      .set(storeData)
      .where(eq(schema.stores.id, storeId))
      .returning()
    return updatedStore
  }

  // 优惠券相关操作
  async createCoupon(couponData) {
    return await this.database.insert(schema.coupons).values(couponData).returning()
  }

  async getCouponById(couponId) {
    const result = await this.database
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.id, couponId))
      .limit(1)
    return result[0]
  }

  async getCouponStores(couponId) {
    return await this.database
      .select({
        id: schema.stores.id,
        name: schema.stores.name,
        address: schema.stores.address,
        city: schema.stores.city,
        lat: schema.stores.lat,
        lng: schema.stores.lng,
        phone: schema.stores.phone,
        opening_hours: schema.stores.opening_hours,
        status: schema.stores.status,
      })
      .from(schema.stores)
      .innerJoin(schema.couponStores, eq(schema.stores.id, schema.couponStores.store_id))
      .where(eq(schema.couponStores.coupon_id, couponId))
  }

  async getCouponsWithStores() {
    return await this.database
      .select({
        coupon: schema.coupons,
        store: schema.stores,
      })
      .from(schema.coupons)
      .leftJoin(schema.couponStores, eq(schema.coupons.id, schema.couponStores.coupon_id))
      .leftJoin(schema.stores, eq(schema.couponStores.store_id, schema.stores.id))
  }

  // 获取活跃的优惠券列表（带分页和筛选）
  async getActiveCoupons(options = {}) {
    const { limit = 10, offset = 0, status = 'active' } = options;
    const { sql } = require('drizzle-orm');
    
    // 获取所有活跃状态的优惠券，首页显示包括未开始的活动（预告作用）
    const result = await this.database.execute(sql`
      SELECT id, title, description, title_zh_cn, title_en_us, title_th_th, 
             description_zh_cn, description_en_us, description_th_th, 
             image_url, media_files, coupon_type, category,
             original_price, discount_price, price_final, face_value, 
             amount_off, min_spend, discount_percent, cap_amount, currency,
             quantity, claimed_count, redeemed_count, valid_from, valid_to, 
             status, created_at, updated_at
      FROM coupons 
      WHERE status = ${status} 
        AND valid_to >= NOW()
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    if (result.rows && result.rows.length > 0) {
      return result.rows;
    }
    
    return [];
  }

  // 获取优惠券总数（用于分页）
  async getCouponsCount(status = 'active') {
    const result = await this.database
      .select({ count: count() })
      .from(schema.coupons)
      .where(eq(schema.coupons.status, status))
    return result[0].count
  }

  // 用户优惠券相关操作
  async claimCoupon(userCouponData) {
    return await this.database.insert(schema.userCoupons).values(userCouponData).returning()
  }

  async getUserCoupons(userId) {
    return await this.database
      .select({
        userCoupon: schema.userCoupons,
        coupon: schema.coupons,
      })
      .from(schema.userCoupons)
      .leftJoin(schema.coupons, eq(schema.userCoupons.coupon_id, schema.coupons.id))
      .where(eq(schema.userCoupons.user_id, userId))
  }

  // 更新优惠券信息
  async updateCoupon(couponId, updates) {
    const [updated] = await this.database
      .update(schema.coupons)
      .set(updates)
      .where(eq(schema.coupons.id, couponId))
      .returning();
    return updated;
  }

  // 原子递增优惠券领取数量
  async incrementCouponClaimedCount(couponId) {
    const [updated] = await this.database
      .update(schema.coupons)
      .set({
        claimed_count: sql`${schema.coupons.claimed_count} + 1`,
        updated_at: new Date(),
      })
      .where(eq(schema.coupons.id, couponId))
      .returning();
    return updated;
  }

  async getUserCouponByRedemptionCode(redemptionCode) {
    return await this.database
      .select({
        userCoupon: schema.userCoupons,
        coupon: schema.coupons,
        user: schema.users,
      })
      .from(schema.userCoupons)
      .leftJoin(schema.coupons, eq(schema.userCoupons.coupon_id, schema.coupons.id))
      .leftJoin(schema.users, eq(schema.userCoupons.user_id, schema.users.id))
      .where(eq(schema.userCoupons.redemption_code, redemptionCode))
      .limit(1)
  }

  // 用户优惠券相关操作
  async getUserCoupons(userId) {
    return await this.database
      .select()
      .from(schema.userCoupons)
      .innerJoin(schema.coupons, eq(schema.userCoupons.coupon_id, schema.coupons.id))
      .where(eq(schema.userCoupons.user_id, userId))
      .orderBy(desc(schema.userCoupons.created_at))
  }

  async getUserCouponById(userCouponId, userId) {
    const result = await this.database
      .select()
      .from(schema.userCoupons)
      .innerJoin(schema.coupons, eq(schema.userCoupons.coupon_id, schema.coupons.id))
      .where(
        and(
          eq(schema.userCoupons.id, userCouponId),
          eq(schema.userCoupons.user_id, userId)
        )
      )
      .limit(1)

    return result.length > 0 ? result[0] : null
  }

  // 核销相关操作
  async redeemCoupon(redemptionData, userCouponId, couponId) {
    return await this.database.transaction(async (tx) => {
      // 创建核销记录
      const [redemption] = await tx
        .insert(schema.redemptions)
        .values(redemptionData)
        .returning()

      // 更新用户优惠券状态
      await tx
        .update(schema.userCoupons)
        .set({
          status: 'used',
          redeemed_at: new Date(),
        })
        .where(eq(schema.userCoupons.id, userCouponId))

      // 更新优惠券统计
      await tx
        .update(schema.coupons)
        .set({
          redeemed_count: sql`redeemed_count + 1`,
        })
        .where(eq(schema.coupons.id, couponId))

      return redemption
    })
  }

  // 员工预设相关操作 (方案D)
  async createStaffPreset(presetData) {
    return await this.database.insert(schema.staffPresets).values(presetData).returning()
  }

  async getStaffPresetsByStoreId(storeId) {
    return await this.database
      .select()
      .from(schema.staffPresets)
      .where(eq(schema.staffPresets.store_id, storeId))
  }

  async getStaffPresetByStaffId(storeId, staffId) {
    return await this.database
      .select()
      .from(schema.staffPresets)
      .where(and(eq(schema.staffPresets.store_id, storeId), eq(schema.staffPresets.staff_id, staffId)))
      .limit(1)
  }

  // 员工绑定相关操作
  async createStaffBinding(bindingData) {
    return await this.database.insert(schema.staffBindings).values(bindingData).returning()
  }

  async getStaffBindingByLineUserId(lineUserId) {
    return await this.database
      .select()
      .from(schema.staffBindings)
      .where(and(eq(schema.staffBindings.line_user_id, lineUserId), eq(schema.staffBindings.binding_status, 'bound')))
      .limit(1)
  }

  async getStaffBindingsByPresetId(presetId) {
    return await this.database
      .select()
      .from(schema.staffBindings)
      .where(eq(schema.staffBindings.preset_id, presetId))
  }

  // 验证员工身份 (核销时使用)
  async verifyStaffForStore(lineUserId, storeId) {
    const result = await this.database
      .select({
        preset_id: schema.staffPresets.id,
        staff_id: schema.staffPresets.staff_id,
        staff_name: schema.staffPresets.name,
        store_name: schema.stores.name,
        binding_status: schema.staffBindings.binding_status
      })
      .from(schema.staffBindings)
      .innerJoin(schema.staffPresets, eq(schema.staffBindings.preset_id, schema.staffPresets.id))
      .innerJoin(schema.stores, eq(schema.staffPresets.store_id, schema.stores.id))
      .where(
        and(
          eq(schema.staffBindings.line_user_id, lineUserId),
          eq(schema.staffBindings.binding_status, 'bound'),
          eq(schema.staffPresets.store_id, storeId),
          eq(schema.staffPresets.status, 'active')
        )
      )
      .limit(1)

    return result.length > 0 ? result[0] : null
  }

  // 数据统计相关
  async getCouponStats() {
    return await this.database
      .select({
        coupon_id: schema.coupons.id,
        title: schema.coupons.title,
        total_quantity: schema.coupons.quantity,
        claimed_count: schema.coupons.claimed_count,
        redeemed_count: schema.coupons.redeemed_count,
        remaining: sql`${schema.coupons.quantity} - ${schema.coupons.claimed_count}`,
      })
      .from(schema.coupons)
  }

  async getStoreStats() {
    return await this.database
      .select({
        store_id: schema.stores.id,
        store_name: schema.stores.name,
        total_redemptions: count(schema.redemptions.id),
      })
      .from(schema.stores)
      .leftJoin(schema.redemptions, eq(schema.stores.id, schema.redemptions.store_id))
      .groupBy(schema.stores.id, schema.stores.name)
  }

  // 通用查询方法（支持原生SQL）
  async query(queryString, params = []) {
    try {
      // 使用连接池直接执行原生SQL查询
      return await pool.query(queryString, params);
    } catch (error) {
      console.error('数据库查询执行失败:', error);
      throw error;
    }
  }

  // ========================
  // 点赞和评论相关操作
  // ========================

  // 检查内容是否存在
  async checkPostExists(postId) {
    const result = await this.database
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId))
      .limit(1)
    return result.length > 0
  }

  // 查找用户对内容的点赞记录
  async findPostLike(userId, postId) {
    const result = await this.database
      .select()
      .from(schema.postLikes)
      .where(and(
        eq(schema.postLikes.user_id, userId),
        eq(schema.postLikes.post_id, postId)
      ))
      .limit(1)
    return result[0] || null
  }

  // 检查用户是否点赞了内容
  async checkUserLikedPost(userId, postId) {
    const like = await this.findPostLike(userId, postId)
    return !!like
  }

  // 添加点赞
  async addPostLike(userId, postId) {
    return await this.database
      .insert(schema.postLikes)
      .values({
        user_id: userId,
        post_id: postId
      })
      .returning()
  }

  // 移除点赞
  async removePostLike(userId, postId) {
    return await this.database
      .delete(schema.postLikes)
      .where(and(
        eq(schema.postLikes.user_id, userId),
        eq(schema.postLikes.post_id, postId)
      ))
      .returning()
  }

  // 获取内容的点赞数
  async getPostLikesCount(postId) {
    const result = await this.database
      .select({ count: count() })
      .from(schema.postLikes)
      .where(eq(schema.postLikes.post_id, postId))
    return result[0]?.count || 0
  }

  // 增加内容点赞数
  async incrementLikesCount(postId) {
    return await this.database
      .update(schema.posts)
      .set({ 
        likes_count: sql`${schema.posts.likes_count} + 1`
      })
      .where(eq(schema.posts.id, postId))
      .returning()
  }

  // 减少内容点赞数
  async decrementLikesCount(postId) {
    return await this.database
      .update(schema.posts)
      .set({ 
        likes_count: sql`GREATEST(${schema.posts.likes_count} - 1, 0)`
      })
      .where(eq(schema.posts.id, postId))
      .returning()
  }

  // 检查评论是否存在
  async checkCommentExists(commentId) {
    const result = await this.database
      .select({ id: schema.postComments.id })
      .from(schema.postComments)
      .where(eq(schema.postComments.id, commentId))
      .limit(1)
    return result.length > 0
  }

  // 添加评论
  async addPostComment(commentData) {
    const [comment] = await this.database
      .insert(schema.postComments)
      .values({
        user_id: commentData.userId,
        post_id: commentData.postId,
        content: commentData.content,
        parent_id: commentData.parentId
      })
      .returning()
    return comment.id
  }

  // 获取内容的评论列表
  async getPostComments(postId, options = {}) {
    const { limit = 20, offset = 0 } = options
    
    return await this.database
      .select({
        id: schema.postComments.id,
        content: schema.postComments.content,
        parent_id: schema.postComments.parent_id,
        created_at: schema.postComments.created_at,
        user_id: schema.postComments.user_id,
        user_nickname: schema.users.nickname,
        user_avatar: schema.users.avatar
      })
      .from(schema.postComments)
      .leftJoin(schema.users, eq(schema.postComments.user_id, schema.users.id))
      .where(and(
        eq(schema.postComments.post_id, postId),
        eq(schema.postComments.status, 'approved')
      ))
      .orderBy(desc(schema.postComments.created_at))
      .limit(limit)
      .offset(offset)
  }

  // 获取评论详情
  async getCommentById(commentId) {
    const result = await this.database
      .select()
      .from(schema.postComments)
      .where(eq(schema.postComments.id, commentId))
      .limit(1)
    return result[0] || null
  }

  // 删除评论
  async deleteComment(commentId) {
    return await this.database
      .delete(schema.postComments)
      .where(eq(schema.postComments.id, commentId))
      .returning()
  }

  // 增加内容评论数
  async incrementCommentsCount(postId) {
    return await this.database
      .update(schema.posts)
      .set({ 
        comments_count: sql`${schema.posts.comments_count} + 1`
      })
      .where(eq(schema.posts.id, postId))
      .returning()
  }

  // 减少内容评论数
  async decrementCommentsCount(postId) {
    return await this.database
      .update(schema.posts)
      .set({ 
        comments_count: sql`GREATEST(${schema.posts.comments_count} - 1, 0)`
      })
      .where(eq(schema.posts.id, postId))
      .returning()
  }

  // PKCE会话管理（数据库持久化存储）
  async createPkceSession(state, verifier, nonce, returnPath) {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分钟后过期
    await this.database
      .insert(schema.pkceSessions)
      .values({
        state: state,
        code_verifier: verifier,
        nonce: nonce,
        return_path: returnPath || '/',
        expires_at: expiresAt
      });
  }

  async getPkceSession(state) {
    const result = await this.database
      .select()
      .from(schema.pkceSessions)
      .where(and(
        eq(schema.pkceSessions.state, state),
        sql`${schema.pkceSessions.expires_at} > NOW()`
      ))
      .limit(1);
    return result[0] || null;
  }

  async deletePkceSession(state) {
    await this.database
      .delete(schema.pkceSessions)
      .where(eq(schema.pkceSessions.state, state));
  }

  async cleanExpiredPkceSessions() {
    const result = await this.database
      .delete(schema.pkceSessions)
      .where(sql`${schema.pkceSessions.expires_at} <= NOW()`);
    return result;
  }

  // 登录成功临时session管理（解决LINE浏览器token传递问题）
  async createLoginSuccessSession(lineId, token) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期
    
    await this.database.insert(schema.loginSuccessSessionsTable).values({
      line_id: lineId,
      token: token,
      expires_at: expiresAt
    }).onConflictDoUpdate({
      target: schema.loginSuccessSessionsTable.line_id,
      set: { token: token, expires_at: expiresAt, created_at: new Date() }
    });
  }

  async getLoginSuccessSession(lineId) {
    const result = await this.database
      .select()
      .from(schema.loginSuccessSessionsTable)
      .where(eq(schema.loginSuccessSessionsTable.line_id, lineId))
      .limit(1);
    
    if (result.length === 0) return null;
    
    const session = result[0];
    // 检查是否过期
    if (new Date() > session.expires_at) {
      // 删除过期session
      await this.database
        .delete(schema.loginSuccessSessionsTable)
        .where(eq(schema.loginSuccessSessionsTable.line_id, lineId));
      return null;
    }
    
    return session;
  }

  async deleteLoginSuccessSession(lineId) {
    await this.database
      .delete(schema.loginSuccessSessionsTable)
      .where(eq(schema.loginSuccessSessionsTable.line_id, lineId));
  }
}

// 创建数据库服务实例
const dbService = new DatabaseService(db)

// 导出所有必要的对象
module.exports = {
  db,
  pool,
  DatabaseService,  
  dbService
}