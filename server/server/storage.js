"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbService = exports.DatabaseService = exports.isPoolHealthy = exports.pool = exports.db = void 0;
exports.testDatabaseConnection = testDatabaseConnection;
exports.validateConnectionBeforeUse = validateConnectionBeforeUse;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const schema = __importStar(require("../shared/schema"));
// 生产级数据库连接池配置
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // 连接池大小优化
    max: 10, // 降低最大连接数，避免过度占用
    min: 2, // 最小连接数，保持基础连接
    // 超时和生命周期配置
    idleTimeoutMillis: 60000, // 空闲连接超时：60秒
    connectionTimeoutMillis: 30000, // 连接超时：30秒
    // 连接保活设置
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    // 查询超时设置
    query_timeout: 30000,
    statement_timeout: 30000,
    // 应用名称，便于数据库监控
    application_name: 'prodee-coupon-system'
});
exports.pool = pool;
// 连接池状态追踪
let isPoolHealthy = true;
exports.isPoolHealthy = isPoolHealthy;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
// 增强的错误处理和连接监控
pool.on('error', async (err, client) => {
    console.error('❌ 数据库连接池错误:', err.code || 'UNKNOWN', err.message);
    // 标记连接池不健康
    exports.isPoolHealthy = isPoolHealthy = false;
    // 特定错误处理和自动恢复
    if (err.code === '57P01') {
        console.log('⚠️ 检测到数据库管理员重启(57P01)，开始自动恢复...');
        await handleDatabaseRestart();
    }
    else if (err.code === 'ECONNREFUSED') {
        console.error('🚨 数据库连接被拒绝，请检查数据库服务状态');
        await attemptReconnect();
    }
    else if (err.code === 'ETIMEDOUT') {
        console.error('⏰ 数据库连接超时，可能网络不稳定');
        await attemptReconnect();
    }
    else if (['ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET'].includes(err.code || '')) {
        console.error('🔌 网络连接问题，尝试重新连接');
        await attemptReconnect();
    }
});
// 57P01专用处理函数：数据库重启恢复
async function handleDatabaseRestart() {
    try {
        console.log('🔄 开始清理失效连接...');
        // 强制结束所有现有连接
        await pool.end();
        // 重新创建连接池
        await recreatePool();
        console.log('✅ 数据库连接池已重建，服务恢复正常');
        exports.isPoolHealthy = isPoolHealthy = true;
        reconnectAttempts = 0;
    }
    catch (error) {
        console.error('❌ 数据库重启恢复失败:', error.message);
        reconnectAttempts++;
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log(`🔁 将在3秒后进行第${reconnectAttempts + 1}次重连尝试...`);
            setTimeout(() => handleDatabaseRestart(), 3000);
        }
        else {
            console.error('🚨 连接恢复失败次数过多，请检查数据库状态');
        }
    }
}
// 通用重连函数
async function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('🚨 已达到最大重连次数，停止尝试');
        return;
    }
    reconnectAttempts++;
    console.log(`🔄 尝试第${reconnectAttempts}次重新连接...`);
    // 等待一段时间后测试连接
    setTimeout(async () => {
        const isHealthy = await testDatabaseConnection();
        if (isHealthy) {
            console.log('✅ 数据库连接已恢复');
            exports.isPoolHealthy = isPoolHealthy = true;
            reconnectAttempts = 0;
        }
        else if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            await attemptReconnect();
        }
    }, 2000 * reconnectAttempts); // 递增延迟
}
pool.on('connect', async (client) => {
    console.log('✅ 数据库连接池：新连接建立');
    try {
        // 连接验证：执行简单查询确保连接可用
        await client.query('SELECT 1');
        // 设置连接级别的超时和配置
        await client.query('SET statement_timeout = 30000');
        await client.query('SET idle_in_transaction_session_timeout = 30000');
        await client.query('SET lock_timeout = 10000');
        // 标记连接池健康
        if (!isPoolHealthy) {
            exports.isPoolHealthy = isPoolHealthy = true;
            reconnectAttempts = 0;
            console.log('✅ 连接池健康状态已恢复');
        }
    }
    catch (error) {
        console.error('❌ 新连接验证失败:', error.message);
        // 释放这个无效连接
        client.release();
    }
});
pool.on('acquire', (client) => {
    console.log('🔄 数据库连接池：连接被获取');
});
pool.on('remove', (client) => {
    console.log('🗑️  数据库连接池：连接被移除');
});
// 增强的数据库连接健康检查函数
async function testDatabaseConnection() {
    let client;
    try {
        console.log('🔍 正在测试数据库连接...');
        // 使用超时机制防止无限等待
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('健康检查超时')), 10000);
        });
        const connectionPromise = pool.connect();
        client = await Promise.race([connectionPromise, timeoutPromise]);
        // 执行多层验证
        const result = await client.query('SELECT NOW() as current_time, version() as db_version');
        const current_time = result.rows[0].current_time;
        const db_version = result.rows[0].db_version;
        console.log('🔗 数据库连接测试成功:');
        console.log('  - 当前时间:', current_time);
        console.log('  - 数据库版本:', db_version.split(' ')[0]);
        // 测试基本查询操作
        await client.query('SELECT COUNT(*) FROM pg_stat_activity');
        return true;
    }
    catch (error) {
        console.error('❌ 数据库连接测试失败:', error.message);
        // 特殊处理57P01错误
        if (error.code === '57P01') {
            console.log('🔄 检测到数据库重启，触发自动恢复...');
            setTimeout(() => handleDatabaseRestart(), 1000);
        }
        return false;
    }
    finally {
        if (client) {
            try {
                client.release();
            }
            catch (releaseError) {
                console.warn('⚠️ 释放连接时出错:', releaseError.message);
            }
        }
    }
}
// 重新创建连接池函数
async function recreatePool() {
    console.log('🔄 正在重新创建数据库连接池...');
    // 创建新的连接池（使用相同配置）
    const newPool = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 10,
        min: 2,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 30000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        query_timeout: 30000,
        statement_timeout: 30000,
        application_name: 'prodee-coupon-system-recovered'
    });
    // 测试新连接池
    const testClient = await newPool.connect();
    await testClient.query('SELECT 1');
    testClient.release();
    // 替换全局pool引用（这需要重新导出db实例）
    console.log('✅ 新连接池创建成功并通过测试');
    return newPool;
}
// 优雅关闭处理
process.on('SIGINT', async () => {
    console.log('📦 正在关闭数据库连接池...');
    await pool.end();
    console.log('✅ 数据库连接池已关闭');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('📦 正在关闭数据库连接池...');
    await pool.end();
    console.log('✅ 数据库连接池已关闭');
    process.exit(0);
});
// 创建Drizzle数据库实例
exports.db = (0, node_postgres_1.drizzle)(pool, { schema });
// 连接前验证装饰器
async function validateConnectionBeforeUse(operation, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // 如果连接池不健康，先进行健康检查
            if (!isPoolHealthy) {
                console.log('⚠️ 连接池状态异常，执行健康检查...');
                const isHealthy = await testDatabaseConnection();
                if (!isHealthy && attempt === retries) {
                    throw new Error('数据库连接不可用，请稍后重试');
                }
                else if (!isHealthy) {
                    console.log(`🔄 健康检查失败，等待${attempt}秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                    continue;
                }
            }
            // 执行实际操作
            return await operation();
        }
        catch (error) {
            console.error(`❌ 数据库操作失败 (尝试 ${attempt}/${retries}):`, error.message);
            // 57P01错误需要特殊处理
            if (error.code === '57P01') {
                exports.isPoolHealthy = isPoolHealthy = false;
                if (attempt < retries) {
                    console.log('🔄 检测到连接中断，重新尝试...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
            }
            // 最后一次尝试失败，抛出错误
            if (attempt === retries) {
                throw error;
            }
            // 其他错误等待后重试
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
    }
}
// 类型导出
__exportStar(require("../shared/schema"), exports);
// 导入必要的Drizzle查询构建器
const drizzle_orm_1 = require("drizzle-orm");
// 数据库操作工具类
class DatabaseService {
    constructor(database) {
        this.database = database;
    }
    // 用户相关操作 - 增加连接验证
    async createUser(userData) {
        return await validateConnectionBeforeUse(async () => {
            return await this.database.insert(schema.users).values(userData).returning();
        });
    }
    async getUserByLineId(lineId) {
        return await validateConnectionBeforeUse(async () => {
            return await this.database
                .select()
                .from(schema.users)
                .where((0, drizzle_orm_1.eq)(schema.users.line_id, lineId))
                .limit(1);
        });
    }
    async updateUser(userId, userData) {
        return await validateConnectionBeforeUse(async () => {
            const [updatedUser] = await this.database
                .update(schema.users)
                .set(userData)
                .where((0, drizzle_orm_1.eq)(schema.users.id, userId))
                .returning();
            return updatedUser;
        });
    }
    // 门店相关操作
    async createStore(storeData) {
        return await this.database.insert(schema.stores).values(storeData).returning();
    }
    async getStoresByIds(storeIds) {
        return await this.database
            .select()
            .from(schema.stores)
            .where((0, drizzle_orm_1.inArray)(schema.stores.id, storeIds));
    }
    async getAllStores(filters) {
        const baseQuery = this.database.select().from(schema.stores);
        if (filters?.status) {
            return await baseQuery.where((0, drizzle_orm_1.eq)(schema.stores.status, filters.status));
        }
        // Note: For search and city filters, we'd need to use LIKE or ILIKE
        // This simplified version returns all stores
        return await baseQuery;
    }
    async getStoreById(storeId) {
        return await this.database
            .select()
            .from(schema.stores)
            .where((0, drizzle_orm_1.eq)(schema.stores.id, storeId))
            .limit(1);
    }
    async updateStore(storeId, storeData) {
        const [updatedStore] = await this.database
            .update(schema.stores)
            .set(storeData)
            .where((0, drizzle_orm_1.eq)(schema.stores.id, storeId))
            .returning();
        return updatedStore;
    }
    // 优惠券相关操作
    async createCoupon(couponData) {
        return await this.database.insert(schema.coupons).values(couponData).returning();
    }
    async getCouponById(couponId) {
        const result = await this.database
            .select()
            .from(schema.coupons)
            .where((0, drizzle_orm_1.eq)(schema.coupons.id, couponId))
            .limit(1);
        return result[0];
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
            .innerJoin(schema.couponStores, (0, drizzle_orm_1.eq)(schema.stores.id, schema.couponStores.store_id))
            .where((0, drizzle_orm_1.eq)(schema.couponStores.coupon_id, couponId));
    }
    async getCouponsWithStores() {
        return await this.database
            .select({
            coupon: schema.coupons,
            store: schema.stores,
        })
            .from(schema.coupons)
            .leftJoin(schema.couponStores, (0, drizzle_orm_1.eq)(schema.coupons.id, schema.couponStores.coupon_id))
            .leftJoin(schema.stores, (0, drizzle_orm_1.eq)(schema.couponStores.store_id, schema.stores.id));
    }
    // 用户优惠券相关操作
    async claimCoupon(userCouponData) {
        return await this.database.insert(schema.userCoupons).values(userCouponData).returning();
    }
    async getUserCoupons(userId) {
        return await this.database
            .select({
            userCoupon: schema.userCoupons,
            coupon: schema.coupons,
        })
            .from(schema.userCoupons)
            .leftJoin(schema.coupons, (0, drizzle_orm_1.eq)(schema.userCoupons.coupon_id, schema.coupons.id))
            .where((0, drizzle_orm_1.eq)(schema.userCoupons.user_id, userId));
    }
    async getUserCouponByRedemptionCode(redemptionCode) {
        return await this.database
            .select({
            userCoupon: schema.userCoupons,
            coupon: schema.coupons,
            user: schema.users,
        })
            .from(schema.userCoupons)
            .leftJoin(schema.coupons, (0, drizzle_orm_1.eq)(schema.userCoupons.coupon_id, schema.coupons.id))
            .leftJoin(schema.users, (0, drizzle_orm_1.eq)(schema.userCoupons.user_id, schema.users.id))
            .where((0, drizzle_orm_1.eq)(schema.userCoupons.redemption_code, redemptionCode))
            .limit(1);
    }
    // 核销相关操作
    async redeemCoupon(redemptionData, userCouponId, couponId) {
        return await this.database.transaction(async (tx) => {
            // 创建核销记录
            const [redemption] = await tx
                .insert(schema.redemptions)
                .values(redemptionData)
                .returning();
            // 更新用户优惠券状态
            await tx
                .update(schema.userCoupons)
                .set({
                status: 'used',
                redeemed_at: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema.userCoupons.id, userCouponId));
            // 更新优惠券统计
            await tx
                .update(schema.coupons)
                .set({
                redeemed_count: (0, drizzle_orm_1.sql) `redeemed_count + 1`,
            })
                .where((0, drizzle_orm_1.eq)(schema.coupons.id, couponId));
            return redemption;
        });
    }
    // 员工预设相关操作 (方案D)
    async createStaffPreset(presetData) {
        return await this.database.insert(schema.staffPresets).values(presetData).returning();
    }
    async getStaffPresetsByStoreId(storeId) {
        return await this.database
            .select()
            .from(schema.staffPresets)
            .where((0, drizzle_orm_1.eq)(schema.staffPresets.store_id, storeId));
    }
    async getStaffPresetByStaffId(storeId, staffId) {
        return await this.database
            .select()
            .from(schema.staffPresets)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.staffPresets.store_id, storeId), (0, drizzle_orm_1.eq)(schema.staffPresets.staff_id, staffId)))
            .limit(1);
    }
    // 员工绑定相关操作
    async createStaffBinding(bindingData) {
        return await this.database.insert(schema.staffBindings).values(bindingData).returning();
    }
    async getStaffBindingByLineUserId(lineUserId) {
        return await this.database
            .select()
            .from(schema.staffBindings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.staffBindings.line_user_id, lineUserId), (0, drizzle_orm_1.eq)(schema.staffBindings.binding_status, 'bound')))
            .limit(1);
    }
    async getStaffBindingsByPresetId(presetId) {
        return await this.database
            .select()
            .from(schema.staffBindings)
            .where((0, drizzle_orm_1.eq)(schema.staffBindings.preset_id, presetId));
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
            .innerJoin(schema.staffPresets, (0, drizzle_orm_1.eq)(schema.staffBindings.preset_id, schema.staffPresets.id))
            .innerJoin(schema.stores, (0, drizzle_orm_1.eq)(schema.staffPresets.store_id, schema.stores.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.staffBindings.line_user_id, lineUserId), (0, drizzle_orm_1.eq)(schema.staffBindings.binding_status, 'bound'), (0, drizzle_orm_1.eq)(schema.staffPresets.store_id, storeId), (0, drizzle_orm_1.eq)(schema.staffPresets.status, 'active')))
            .limit(1);
        return result.length > 0 ? result[0] : null;
    }
    // PKCE会话管理（用于LINE登录）
    async createPkceSession(state, verifier, nonce, returnPath = '/') {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分钟后过期
        await this.database.insert(schema.pkceSessions).values({
            state,
            verifier,
            nonce,
            return_path: returnPath,
            expires_at: expiresAt
        });
    }
    async getPkceSession(state) {
        const result = await this.database
            .select()
            .from(schema.pkceSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.pkceSessions.state, state), (0, drizzle_orm_1.sql) `${schema.pkceSessions.expires_at} > NOW()` // 未过期
        ))
            .limit(1);
        return result[0] || null;
    }
    async deletePkceSession(state) {
        await this.database
            .delete(schema.pkceSessions)
            .where((0, drizzle_orm_1.eq)(schema.pkceSessions.state, state));
    }
    async cleanExpiredPkceSessions() {
        const result = await this.database
            .delete(schema.pkceSessions)
            .where((0, drizzle_orm_1.sql) `${schema.pkceSessions.expires_at} <= NOW()`);
        return result;
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
            remaining: (0, drizzle_orm_1.sql) `${schema.coupons.quantity} - ${schema.coupons.claimed_count}`,
        })
            .from(schema.coupons);
    }
    async getStoreStats() {
        return await this.database
            .select({
            store_id: schema.stores.id,
            store_name: schema.stores.name,
            total_redemptions: (0, drizzle_orm_1.count)(schema.redemptions.id),
        })
            .from(schema.stores)
            .leftJoin(schema.redemptions, (0, drizzle_orm_1.eq)(schema.stores.id, schema.redemptions.store_id))
            .groupBy(schema.stores.id, schema.stores.name);
    }
}
exports.DatabaseService = DatabaseService;
// 创建数据库服务实例
exports.dbService = new DatabaseService(exports.db);
