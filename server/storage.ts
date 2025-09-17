import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../shared/schema'

// 数据库连接池配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// 创建Drizzle数据库实例
export const db = drizzle(pool, { schema })

// 导出连接池用于健康检查等
export { pool }

// 类型导出
export * from '../shared/schema'

// 导入必要的Drizzle查询构建器
import { eq, inArray, count, sql, and } from 'drizzle-orm'

// 数据库操作工具类
export class DatabaseService {
  private database: typeof db
  
  constructor(database: typeof db) {
    this.database = database
  }

  // 用户相关操作
  async createUser(userData: schema.NewUser) {
    return await this.database.insert(schema.users).values(userData).returning()
  }

  async getUserByLineId(lineId: string) {
    return await this.database
      .select()
      .from(schema.users)
      .where(eq(schema.users.line_id, lineId))
      .limit(1)
  }

  async updateUser(userId: number, userData: Partial<schema.NewUser>) {
    const [updatedUser] = await this.database
      .update(schema.users)
      .set(userData)
      .where(eq(schema.users.id, userId))
      .returning()
    return updatedUser
  }

  // 门店相关操作
  async createStore(storeData: schema.NewStore) {
    return await this.database.insert(schema.stores).values(storeData).returning()
  }

  async getStoresByIds(storeIds: number[]) {
    return await this.database
      .select()
      .from(schema.stores)
      .where(inArray(schema.stores.id, storeIds))
  }

  async getAllStores(filters?: { search?: string; city?: string; status?: string }) {
    let query = this.database.select().from(schema.stores)
    
    if (filters?.status) {
      query = query.where(eq(schema.stores.status, filters.status))
    }
    
    // Note: For search and city filters, we'd need to use LIKE or ILIKE
    // This simplified version returns all stores
    return await query
  }

  async getStoreById(storeId: number) {
    return await this.database
      .select()
      .from(schema.stores)
      .where(eq(schema.stores.id, storeId))
      .limit(1)
  }

  async updateStore(storeId: number, storeData: Partial<schema.NewStore>) {
    const [updatedStore] = await this.database
      .update(schema.stores)
      .set(storeData)
      .where(eq(schema.stores.id, storeId))
      .returning()
    return updatedStore
  }

  // 优惠券相关操作
  async createCoupon(couponData: schema.NewCoupon) {
    return await this.database.insert(schema.coupons).values(couponData).returning()
  }

  async getCouponById(couponId: number) {
    const result = await this.database
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.id, couponId))
      .limit(1)
    return result[0]
  }

  async getCouponStores(couponId: number) {
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

  // 用户优惠券相关操作
  async claimCoupon(userCouponData: schema.NewUserCoupon) {
    return await this.database.insert(schema.userCoupons).values(userCouponData).returning()
  }

  async getUserCoupons(userId: number) {
    return await this.database
      .select({
        userCoupon: schema.userCoupons,
        coupon: schema.coupons,
      })
      .from(schema.userCoupons)
      .leftJoin(schema.coupons, eq(schema.userCoupons.coupon_id, schema.coupons.id))
      .where(eq(schema.userCoupons.user_id, userId))
  }

  async getUserCouponByRedemptionCode(redemptionCode: string) {
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

  // 核销相关操作
  async redeemCoupon(redemptionData: schema.NewRedemption, userCouponId: number, couponId: number) {
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
  async createStaffPreset(presetData: schema.NewStaffPreset) {
    return await this.database.insert(schema.staffPresets).values(presetData).returning()
  }

  async getStaffPresetsByStoreId(storeId: number) {
    return await this.database
      .select()
      .from(schema.staffPresets)
      .where(eq(schema.staffPresets.store_id, storeId))
  }

  async getStaffPresetByStaffId(storeId: number, staffId: string) {
    return await this.database
      .select()
      .from(schema.staffPresets)
      .where(and(eq(schema.staffPresets.store_id, storeId), eq(schema.staffPresets.staff_id, staffId)))
      .limit(1)
  }

  // 员工绑定相关操作
  async createStaffBinding(bindingData: schema.NewStaffBinding) {
    return await this.database.insert(schema.staffBindings).values(bindingData).returning()
  }

  async getStaffBindingByLineUserId(lineUserId: string) {
    return await this.database
      .select()
      .from(schema.staffBindings)
      .where(and(eq(schema.staffBindings.line_user_id, lineUserId), eq(schema.staffBindings.binding_status, 'bound')))
      .limit(1)
  }

  async getStaffBindingsByPresetId(presetId: number) {
    return await this.database
      .select()
      .from(schema.staffBindings)
      .where(eq(schema.staffBindings.preset_id, presetId))
  }

  // 验证员工身份 (核销时使用)
  async verifyStaffForStore(lineUserId: string, storeId: number) {
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
}

// 创建数据库服务实例
export const dbService = new DatabaseService(db)