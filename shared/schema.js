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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoPlayStatsRelations = exports.postViewsRelations = exports.postCommentsRelations = exports.postFavoritesRelations = exports.postLikesRelations = exports.postsRelations = exports.couponCodes = exports.rewardRedemptions = exports.rewardItems = exports.loginSuccessSessionsTable = exports.pkceSessions = exports.pointRules = exports.pointBuckets = exports.pointTransactions = exports.userFavorites = exports.postConversions = exports.videoPlayStats = exports.postViews = exports.postFavorites = exports.postComments = exports.postLikes = exports.posts = exports.richMenuConfigs = exports.staffBindingsRelations = exports.staffPresetsRelations = exports.verifiersRelations = exports.redemptionsRelations = exports.userCouponsRelations = exports.couponStoresRelations = exports.couponsRelations = exports.storesRelations = exports.usersRelations = exports.admins = exports.verifiers = exports.staffBindings = exports.staffPresets = exports.redemptions = exports.userCoupons = exports.couponStores = exports.coupons = exports.stores = exports.users = exports.campaignStatusEnum = exports.postStatusEnum = exports.postTypeEnum = exports.categoryEnum = exports.couponTypeEnum = exports.bindingStatusEnum = exports.contactMethodEnum = exports.couponStatusEnum = void 0;
exports.couponCodesRelations = exports.rewardRedemptionsRelations = exports.rewardItemsRelations = exports.pointBucketsRelations = exports.pointTransactionsRelations = exports.userFavoritesRelations = exports.postConversionsRelations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// 枚举类型定义
exports.couponStatusEnum = (0, pg_core_1.pgEnum)('coupon_status', ['claimed', 'used', 'expired']);
exports.contactMethodEnum = (0, pg_core_1.pgEnum)('contact_method', ['line_id', 'phone', 'email']);
exports.bindingStatusEnum = (0, pg_core_1.pgEnum)('binding_status', ['pending', 'bound', 'inactive']);
exports.couponTypeEnum = (0, pg_core_1.pgEnum)('coupon_type', ['final_price', 'gift_card', 'cash_voucher', 'full_reduction', 'percentage_discount', 'fixed_discount']);
exports.categoryEnum = (0, pg_core_1.pgEnum)('category', ['recommend', '3c', 'fashion', 'food', 'beauty', 'nails', 'mom']);
exports.postTypeEnum = (0, pg_core_1.pgEnum)('post_type', ['video', 'article']);
exports.postStatusEnum = (0, pg_core_1.pgEnum)('post_status', ['draft', 'published', 'archived']);
exports.campaignStatusEnum = (0, pg_core_1.pgEnum)('campaign_status', ['draft', 'active', 'paused']);
// 1. 用户表 (users)
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    line_id: (0, pg_core_1.varchar)('line_id', { length: 100 }).unique(),
    facebook_user_id: (0, pg_core_1.varchar)('facebook_user_id', { length: 100 }).unique(),
    nickname: (0, pg_core_1.varchar)('nickname', { length: 100 }),
    avatar: (0, pg_core_1.varchar)('avatar', { length: 500 }),
    is_following: (0, pg_core_1.boolean)('is_following').default(false),
    language: (0, pg_core_1.varchar)('language', { length: 10 }).default('zh-cn'),
    points: (0, pg_core_1.integer)('points').default(0), // 用户积分
    level: (0, pg_core_1.integer)('level').default(1), // 用户等级 L1, L2, L3...
    province: (0, pg_core_1.varchar)('province', { length: 50 }).default('bangkok'), // 用户所在省份
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// 2. 门店表 (stores)
exports.stores = (0, pg_core_1.pgTable)('stores', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 200 }).notNull(),
    address: (0, pg_core_1.varchar)('address', { length: 500 }).notNull(),
    // 多语言字段
    name_zh_cn: (0, pg_core_1.varchar)('name_zh_cn', { length: 200 }),
    name_en_us: (0, pg_core_1.varchar)('name_en_us', { length: 200 }),
    name_th_th: (0, pg_core_1.varchar)('name_th_th', { length: 200 }),
    address_zh_cn: (0, pg_core_1.varchar)('address_zh_cn', { length: 500 }),
    address_en_us: (0, pg_core_1.varchar)('address_en_us', { length: 500 }),
    address_th_th: (0, pg_core_1.varchar)('address_th_th', { length: 500 }),
    city: (0, pg_core_1.varchar)('city', { length: 100 }), // 城市
    lat: (0, pg_core_1.decimal)('lat', { precision: 10, scale: 8 }),
    lng: (0, pg_core_1.decimal)('lng', { precision: 11, scale: 8 }),
    image_url: (0, pg_core_1.varchar)('image_url', { length: 500 }),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).unique(),
    google_place_id: (0, pg_core_1.varchar)('google_place_id', { length: 200 }), // Google Place ID
    rating: (0, pg_core_1.decimal)('rating', { precision: 3, scale: 2 }), // 评分 (0.00-5.00)
    opening_hours: (0, pg_core_1.text)('opening_hours'), // 营业时间JSON格式
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }), // 电话号码
    website: (0, pg_core_1.varchar)('website', { length: 500 }), // 网站
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('active'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// 3. 优惠券活动表 (coupons)
exports.coupons = (0, pg_core_1.pgTable)('coupons', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    title: (0, pg_core_1.varchar)('title', { length: 200 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    // 多语言字段
    title_zh_cn: (0, pg_core_1.varchar)('title_zh_cn', { length: 200 }),
    title_en_us: (0, pg_core_1.varchar)('title_en_us', { length: 200 }),
    title_th_th: (0, pg_core_1.varchar)('title_th_th', { length: 200 }),
    description_zh_cn: (0, pg_core_1.text)('description_zh_cn'),
    description_en_us: (0, pg_core_1.text)('description_en_us'),
    description_th_th: (0, pg_core_1.text)('description_th_th'),
    image_url: (0, pg_core_1.varchar)('image_url', { length: 500 }), // 保留向后兼容
    media_files: (0, pg_core_1.json)('media_files'), // 新增：多媒体文件JSON数组 [{type: 'image'|'video', url: string, filename: string, size: number}]
    // 券类型系统
    coupon_type: (0, exports.couponTypeEnum)('coupon_type').default('final_price').notNull(),
    category: (0, exports.categoryEnum)('category').default('recommend').notNull(), // 行业类目
    // 原有价格字段（向后兼容，现在可选）
    original_price: (0, pg_core_1.decimal)('original_price', { precision: 10, scale: 2 }),
    discount_price: (0, pg_core_1.decimal)('discount_price', { precision: 10, scale: 2 }),
    // 新的灵活价格字段
    price_final: (0, pg_core_1.decimal)('price_final', { precision: 10, scale: 2 }), // 最终价格
    face_value: (0, pg_core_1.decimal)('face_value', { precision: 10, scale: 2 }), // 面值（礼品券）
    amount_off: (0, pg_core_1.decimal)('amount_off', { precision: 10, scale: 2 }), // 抵用/减免金额
    min_spend: (0, pg_core_1.decimal)('min_spend', { precision: 10, scale: 2 }), // 最低消费金额
    discount_percent: (0, pg_core_1.decimal)('discount_percent', { precision: 5, scale: 2 }), // 折扣百分比 (0.00-100.00)
    cap_amount: (0, pg_core_1.decimal)('cap_amount', { precision: 10, scale: 2 }), // 折扣封顶金额
    currency: (0, pg_core_1.varchar)('currency', { length: 3 }).default('CNY'), // 货币代码
    quantity: (0, pg_core_1.integer)('quantity').notNull(),
    claimed_count: (0, pg_core_1.integer)('claimed_count').default(0),
    redeemed_count: (0, pg_core_1.integer)('redeemed_count').default(0),
    valid_from: (0, pg_core_1.timestamp)('valid_from').notNull(),
    valid_to: (0, pg_core_1.timestamp)('valid_to').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('draft'), // draft, active, paused
    // 员工操作指引字段
    staff_sop: (0, pg_core_1.text)('staff_sop'), // 员工操作指南/SOP（Standard Operating Procedure）
    staff_notes: (0, pg_core_1.text)('staff_notes'), // 员工注意事项
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// 4. 优惠券-门店关联表 (coupon_stores)
exports.couponStores = (0, pg_core_1.pgTable)('coupon_stores', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    coupon_id: (0, pg_core_1.bigint)('coupon_id', { mode: 'number' }).notNull().references(() => exports.coupons.id, { onDelete: 'cascade' }),
    store_id: (0, pg_core_1.bigint)('store_id', { mode: 'number' }).notNull().references(() => exports.stores.id, { onDelete: 'cascade' }),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// 5. 用户优惠券记录表 (user_coupons)
exports.userCoupons = (0, pg_core_1.pgTable)('user_coupons', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    coupon_id: (0, pg_core_1.bigint)('coupon_id', { mode: 'number' }).notNull().references(() => exports.coupons.id, { onDelete: 'cascade' }),
    redemption_code: (0, pg_core_1.char)('redemption_code', { length: 6 }).notNull().unique(),
    qr_code_data: (0, pg_core_1.text)('qr_code_data').notNull(),
    status: (0, exports.couponStatusEnum)('status').default('claimed').notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(), // 领取时间
    redeemed_at: (0, pg_core_1.timestamp)('redeemed_at'), // 核销时间
    expires_at: (0, pg_core_1.timestamp)('expires_at').notNull() // 过期时间（从优惠券活动复制）
});
// 6. 核销记录表 (redemptions)
exports.redemptions = (0, pg_core_1.pgTable)('redemptions', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_coupon_id: (0, pg_core_1.bigint)('user_coupon_id', { mode: 'number' }).notNull().references(() => exports.userCoupons.id, { onDelete: 'cascade' }),
    store_id: (0, pg_core_1.bigint)('store_id', { mode: 'number' }).notNull().references(() => exports.stores.id),
    verifier_id: (0, pg_core_1.bigint)('verifier_id', { mode: 'number' }).references(() => exports.users.id), // 核销员（用户表中的LINE ID）
    verification_method: (0, pg_core_1.varchar)('verification_method', { length: 20 }).default('qrcode'), // qrcode, manual
    redeemed_at: (0, pg_core_1.timestamp)('redeemed_at').defaultNow().notNull(),
    notes: (0, pg_core_1.text)('notes') // 核销备注
});
// 7. 员工预设表 (staff_presets) - 管理员预设员工信息
exports.staffPresets = (0, pg_core_1.pgTable)('staff_presets', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    store_id: (0, pg_core_1.bigint)('store_id', { mode: 'number' }).notNull().references(() => exports.stores.id, { onDelete: 'cascade' }),
    staff_id: (0, pg_core_1.varchar)('staff_id', { length: 50 }).notNull(), // 员工工号
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // 员工姓名
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }), // 员工LINE绑定电话（用于验证）- 临时可选以避免数据丢失
    department: (0, pg_core_1.varchar)('department', { length: 100 }), // 部门（可选）
    position: (0, pg_core_1.varchar)('position', { length: 100 }), // 职位（可选）
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('active'), // active, inactive
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
}, (table) => ({
    // 确保每个门店内员工工号唯一
    unique_store_staff: (0, pg_core_1.uniqueIndex)('unique_store_staff_id').on(table.store_id, table.staff_id),
}));
// 8. 员工绑定表 (staff_bindings) - LINE User ID绑定记录
exports.staffBindings = (0, pg_core_1.pgTable)('staff_bindings', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    preset_id: (0, pg_core_1.bigint)('preset_id', { mode: 'number' }).notNull().references(() => exports.staffPresets.id, { onDelete: 'cascade' }),
    line_user_id: (0, pg_core_1.varchar)('line_user_id', { length: 50 }).unique(), // LINE User ID (U开头的32位)
    display_name: (0, pg_core_1.varchar)('display_name', { length: 100 }), // LINE显示名称（仅记录，不用于验证）
    binding_status: (0, exports.bindingStatusEnum)('binding_status').default('pending').notNull(),
    bound_at: (0, pg_core_1.timestamp)('bound_at'), // 绑定时间
    last_active_at: (0, pg_core_1.timestamp)('last_active_at'), // 最后活跃时间
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// 7. 核销员授权表 (verifiers) - 保留兼容性，暂时废弃
exports.verifiers = (0, pg_core_1.pgTable)('verifiers', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    store_id: (0, pg_core_1.bigint)('store_id', { mode: 'number' }).notNull().references(() => exports.stores.id, { onDelete: 'cascade' }),
    contact_method: (0, exports.contactMethodEnum)('contact_method').default('line_id').notNull(), // 联系方式类型
    line_id: (0, pg_core_1.varchar)('line_id', { length: 100 }), // 店员LINE ID (可为空)
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }), // 手机号码 (可为空)
    email: (0, pg_core_1.varchar)('email', { length: 200 }), // 邮箱地址 (可为空)
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // 店员姓名
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('active'), // active, inactive
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// 8. 管理员表 (admins)
exports.admins = (0, pg_core_1.pgTable)('admins', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    email: (0, pg_core_1.varchar)('email', { length: 200 }).notNull().unique(),
    password: (0, pg_core_1.varchar)('password', { length: 255 }).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }),
    role: (0, pg_core_1.varchar)('role', { length: 50 }).default('admin'), // 'super_admin' | 'content_operator'
    display_name: (0, pg_core_1.varchar)('display_name', { length: 100 }), // 对外显示名称（如：PreDee小美）
    avatar: (0, pg_core_1.varchar)('avatar', { length: 500 }), // 头像URL
    department: (0, pg_core_1.varchar)('department', { length: 100 }), // 所属部门
    is_active: (0, pg_core_1.boolean)('is_active').default(true), // 账号状态
    created_by: (0, pg_core_1.bigint)('created_by', { mode: 'number' }), // 创建者ID（超级管理员）
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('active'),
    last_login: (0, pg_core_1.timestamp)('last_login'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// 关系定义
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    userCoupons: many(exports.userCoupons),
    redemptions: many(exports.redemptions, { relationName: 'verifierRedemptions' }),
    favorites: many(exports.userFavorites),
    pointTransactions: many(exports.pointTransactions),
    pointBuckets: many(exports.pointBuckets),
    rewardRedemptions: many(exports.rewardRedemptions)
}));
exports.storesRelations = (0, drizzle_orm_1.relations)(exports.stores, ({ many }) => ({
    couponStores: many(exports.couponStores),
    redemptions: many(exports.redemptions),
    verifiers: many(exports.verifiers),
    staffPresets: many(exports.staffPresets)
}));
exports.couponsRelations = (0, drizzle_orm_1.relations)(exports.coupons, ({ many }) => ({
    userCoupons: many(exports.userCoupons),
    couponStores: many(exports.couponStores),
    favorites: many(exports.userFavorites),
    pointTransactions: many(exports.pointTransactions)
}));
exports.couponStoresRelations = (0, drizzle_orm_1.relations)(exports.couponStores, ({ one }) => ({
    coupon: one(exports.coupons, {
        fields: [exports.couponStores.coupon_id],
        references: [exports.coupons.id]
    }),
    store: one(exports.stores, {
        fields: [exports.couponStores.store_id],
        references: [exports.stores.id]
    })
}));
exports.userCouponsRelations = (0, drizzle_orm_1.relations)(exports.userCoupons, ({ one, many }) => ({
    user: one(exports.users, {
        fields: [exports.userCoupons.user_id],
        references: [exports.users.id]
    }),
    coupon: one(exports.coupons, {
        fields: [exports.userCoupons.coupon_id],
        references: [exports.coupons.id]
    }),
    redemptions: many(exports.redemptions)
}));
exports.redemptionsRelations = (0, drizzle_orm_1.relations)(exports.redemptions, ({ one }) => ({
    userCoupon: one(exports.userCoupons, {
        fields: [exports.redemptions.user_coupon_id],
        references: [exports.userCoupons.id]
    }),
    store: one(exports.stores, {
        fields: [exports.redemptions.store_id],
        references: [exports.stores.id]
    }),
    verifier: one(exports.users, {
        fields: [exports.redemptions.verifier_id],
        references: [exports.users.id],
        relationName: 'verifierRedemptions'
    })
}));
exports.verifiersRelations = (0, drizzle_orm_1.relations)(exports.verifiers, ({ one }) => ({
    store: one(exports.stores, {
        fields: [exports.verifiers.store_id],
        references: [exports.stores.id]
    })
}));
exports.staffPresetsRelations = (0, drizzle_orm_1.relations)(exports.staffPresets, ({ one, many }) => ({
    store: one(exports.stores, {
        fields: [exports.staffPresets.store_id],
        references: [exports.stores.id]
    }),
    bindings: many(exports.staffBindings)
}));
exports.staffBindingsRelations = (0, drizzle_orm_1.relations)(exports.staffBindings, ({ one }) => ({
    preset: one(exports.staffPresets, {
        fields: [exports.staffBindings.preset_id],
        references: [exports.staffPresets.id]
    })
}));
// Rich Menu配置表 - 存储LINE Rich Menu ID
exports.richMenuConfigs = (0, pg_core_1.pgTable)('rich_menu_configs', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    menu_type: (0, pg_core_1.varchar)('menu_type', { length: 20 }).notNull(), // user, staff
    menu_name: (0, pg_core_1.varchar)('menu_name', { length: 100 }).notNull(),
    rich_menu_id: (0, pg_core_1.varchar)('rich_menu_id', { length: 100 }).notNull(),
    is_active: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
}, (table) => ({
    uniqueMenuType: (0, pg_core_1.uniqueIndex)('rich_menu_configs_menu_type_unique').on(table.menu_type)
}));
// 7. 内容管理表 (posts)
exports.posts = (0, pg_core_1.pgTable)('posts', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    type: (0, exports.postTypeEnum)('type').notNull(), // 'video' | 'article'
    title: (0, pg_core_1.varchar)('title', { length: 200 }).notNull(),
    content: (0, pg_core_1.text)('content'),
    // 多语言字段
    title_zh_cn: (0, pg_core_1.varchar)('title_zh_cn', { length: 200 }),
    title_en_us: (0, pg_core_1.varchar)('title_en_us', { length: 200 }),
    title_th_th: (0, pg_core_1.varchar)('title_th_th', { length: 200 }),
    content_zh_cn: (0, pg_core_1.text)('content_zh_cn'),
    content_en_us: (0, pg_core_1.text)('content_en_us'),
    content_th_th: (0, pg_core_1.text)('content_th_th'),
    // 媒体文件 - 存储为JSON数组 [{type: 'image'|'video', url: string, filename: string}]
    media_files: (0, pg_core_1.json)('media_files'),
    // 状态管理
    status: (0, exports.postStatusEnum)('status').default('draft').notNull(),
    // 关联优惠券（可选）
    coupon_id: (0, pg_core_1.bigint)('coupon_id', { mode: 'number' }),
    // 活动绑定字段
    activity_id: (0, pg_core_1.bigint)('activity_id', { mode: 'number' }), // 绑定的活动ID
    cta_type: (0, pg_core_1.varchar)('cta_type', { length: 50 }), // 按钮类型：coupon, groupbuy, detail
    cta_text: (0, pg_core_1.varchar)('cta_text', { length: 100 }), // 自定义按钮文案
    cta_link: (0, pg_core_1.varchar)('cta_link', { length: 500 }), // 自定义按钮链接
    // 定时发布字段
    publish_at: (0, pg_core_1.timestamp)('publish_at'),
    // 多语言翻译字段
    translations: (0, pg_core_1.json)('translations'),
    // 封面图片（视频专用）
    poster: (0, pg_core_1.varchar)('poster', { length: 500 }),
    // 统计字段
    likes_count: (0, pg_core_1.integer)('likes_count').default(0),
    comments_count: (0, pg_core_1.integer)('comments_count').default(0),
    views_count: (0, pg_core_1.integer)('views_count').default(0),
    shares_count: (0, pg_core_1.integer)('shares_count').default(0),
    favorites_count: (0, pg_core_1.integer)('favorites_count').default(0),
    // 置顶和排序字段
    is_pinned: (0, pg_core_1.boolean)('is_pinned').default(false).notNull(), // 是否置顶
    sort_order: (0, pg_core_1.integer)('sort_order').default(0), // 排序权重（越大越靠前）
    hot_score: (0, pg_core_1.decimal)('hot_score', { precision: 10, scale: 2 }).default('0'), // 热度分数
    // 作者字段（改为引用admins表 - 内容由管理员/员工创建）
    author_id: (0, pg_core_1.bigint)('author_id', { mode: 'number' }).references(() => exports.admins.id, { onDelete: 'set null' }),
    // 发布时间
    published_at: (0, pg_core_1.timestamp)('published_at'),
    // 创建和更新时间
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// 8. 内容点赞表 (post_likes)
exports.postLikes = (0, pg_core_1.pgTable)('post_likes', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    post_id: (0, pg_core_1.bigint)('post_id', { mode: 'number' }).notNull().references(() => exports.posts.id, { onDelete: 'cascade' }),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
}, (table) => ({
    // 确保用户对同一个内容只能点赞一次
    unique_user_post: (0, pg_core_1.uniqueIndex)('unique_user_post_like').on(table.user_id, table.post_id),
}));
// 9. 内容评论表 (post_comments)
exports.postComments = (0, pg_core_1.pgTable)('post_comments', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    post_id: (0, pg_core_1.bigint)('post_id', { mode: 'number' }).notNull().references(() => exports.posts.id, { onDelete: 'cascade' }),
    parent_id: (0, pg_core_1.bigint)('parent_id', { mode: 'number' }).references(() => exports.postComments.id, { onDelete: 'cascade' }), // 回复功能
    content: (0, pg_core_1.text)('content').notNull(),
    // 多语言字段
    content_zh_cn: (0, pg_core_1.text)('content_zh_cn'),
    content_en_us: (0, pg_core_1.text)('content_en_us'),
    content_th_th: (0, pg_core_1.text)('content_th_th'),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('approved').notNull(), // approved, pending, rejected
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// 9.5. 内容收藏表 (post_favorites)
exports.postFavorites = (0, pg_core_1.pgTable)('post_favorites', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    post_id: (0, pg_core_1.bigint)('post_id', { mode: 'number' }).notNull().references(() => exports.posts.id, { onDelete: 'cascade' }),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
}, (table) => ({
    // 确保用户对同一个内容只能收藏一次
    unique_user_post_favorite: (0, pg_core_1.uniqueIndex)('unique_user_post_favorite').on(table.user_id, table.post_id),
}));
// 10. 内容浏览记录表 (post_views) - 防止重复计数
exports.postViews = (0, pg_core_1.pgTable)('post_views', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).references(() => exports.users.id, { onDelete: 'cascade' }),
    post_id: (0, pg_core_1.bigint)('post_id', { mode: 'number' }).notNull().references(() => exports.posts.id, { onDelete: 'cascade' }),
    session_id: (0, pg_core_1.varchar)('session_id', { length: 100 }),
    ip_address: (0, pg_core_1.varchar)('ip_address', { length: 50 }),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
}, (table) => ({
    user_post_idx: (0, pg_core_1.uniqueIndex)('post_views_user_post_idx').on(table.user_id, table.post_id, table.created_at)
}));
// 10.5. 视频播放统计表 (video_play_stats) - 记录视频播放详细数据
exports.videoPlayStats = (0, pg_core_1.pgTable)('video_play_stats', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).references(() => exports.users.id, { onDelete: 'cascade' }),
    post_id: (0, pg_core_1.bigint)('post_id', { mode: 'number' }).notNull().references(() => exports.posts.id, { onDelete: 'cascade' }),
    session_id: (0, pg_core_1.varchar)('session_id', { length: 100 }), // 会话ID，用于匿名用户
    play_duration: (0, pg_core_1.integer)('play_duration').default(0), // 播放时长（秒）
    video_duration: (0, pg_core_1.integer)('video_duration'), // 视频总时长（秒）
    completion_rate: (0, pg_core_1.decimal)('completion_rate', { precision: 5, scale: 2 }), // 完播率（0-100）
    is_completed: (0, pg_core_1.boolean)('is_completed').default(false), // 是否完整播放
    source: (0, pg_core_1.varchar)('source', { length: 50 }).default('feed'), // 来源：feed, detail, share
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// 11. 内容转化记录表 (post_conversions) - 追踪从内容到领券的转化
exports.postConversions = (0, pg_core_1.pgTable)('post_conversions', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    post_id: (0, pg_core_1.bigint)('post_id', { mode: 'number' }).notNull().references(() => exports.posts.id, { onDelete: 'cascade' }),
    activity_id: (0, pg_core_1.bigint)('activity_id', { mode: 'number' }),
    conversion_type: (0, pg_core_1.varchar)('conversion_type', { length: 50 }).notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// 12. 用户收藏表 (user_favorites)
exports.userFavorites = (0, pg_core_1.pgTable)('user_favorites', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    coupon_id: (0, pg_core_1.bigint)('coupon_id', { mode: 'number' }).notNull().references(() => exports.coupons.id, { onDelete: 'cascade' }),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
}, (table) => ({
    // 确保用户对同一个优惠券只能收藏一次
    unique_user_coupon: (0, pg_core_1.uniqueIndex)('unique_user_coupon_favorite').on(table.user_id, table.coupon_id),
}));
// 13. 积分记录表 (point_transactions) - 扩展字段
exports.pointTransactions = (0, pg_core_1.pgTable)('point_transactions', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.varchar)('type', { length: 20 }).notNull(), // 'earn' | 'spend' | 'expire' | 'admin_adjust'
    amount: (0, pg_core_1.integer)('amount').notNull(), // 正数为获得，负数为消费
    description: (0, pg_core_1.varchar)('description', { length: 200 }).notNull(), // 积分变动说明
    related_coupon_id: (0, pg_core_1.bigint)('related_coupon_id', { mode: 'number' }), // 关联的优惠券ID（可选）
    status: (0, pg_core_1.varchar)('status', { length: 16 }).default('posted').notNull(), // pending/posted/reversed
    idempotency_key: (0, pg_core_1.varchar)('idempotency_key', { length: 64 }).unique(), // 幂等性键
    reason_code: (0, pg_core_1.varchar)('reason_code', { length: 32 }), // signup/checkin/order_pay/redeem/refund等
    order_id: (0, pg_core_1.bigint)('order_id', { mode: 'number' }), // 关联订单ID
    bucket_id: (0, pg_core_1.bigint)('bucket_id', { mode: 'number' }), // 关联积分批次ID
    metadata: (0, pg_core_1.json)('metadata'), // 额外元数据（JSON格式）
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
}, (table) => ({
    idx_pt_user_created: (0, pg_core_1.uniqueIndex)('idx_pt_user_created').on(table.user_id, table.created_at)
}));
// 14. 积分批次表 (point_buckets) - 用于过期管理与FIFO扣减
exports.pointBuckets = (0, pg_core_1.pgTable)('point_buckets', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    earned: (0, pg_core_1.integer)('earned').notNull(), // 原始获得积分数
    remaining: (0, pg_core_1.integer)('remaining').notNull(), // 剩余可用积分
    reason_code: (0, pg_core_1.varchar)('reason_code', { length: 32 }).notNull(), // 获得原因
    source_id: (0, pg_core_1.bigint)('source_id', { mode: 'number' }), // 来源ID（订单/活动等）
    expire_at: (0, pg_core_1.timestamp)('expire_at').notNull(), // 过期时间
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
}, (table) => ({
    idx_pb_user_exp: (0, pg_core_1.uniqueIndex)('idx_pb_user_exp').on(table.user_id, table.expire_at)
}));
// 15. 积分规则配置表 (point_rules) - 可配置的业务规则
exports.pointRules = (0, pg_core_1.pgTable)('point_rules', {
    key: (0, pg_core_1.text)('key').primaryKey(), // 规则键名
    value: (0, pg_core_1.text)('value').notNull() // 规则值
});
// 15.5 PKCE会话存储表 (pkce_sessions) - 用于LINE登录OAuth流程
exports.pkceSessions = (0, pg_core_1.pgTable)('pkce_sessions', {
    state: (0, pg_core_1.varchar)('state', { length: 256 }).primaryKey(), // OAuth state参数，用作主键（扩展到256字符以支持长路径）
    code_verifier: (0, pg_core_1.varchar)('code_verifier', { length: 256 }).notNull(), // PKCE code_verifier（扩展到256字符）
    nonce: (0, pg_core_1.varchar)('nonce', { length: 128 }).notNull(), // OpenID nonce（扩展到128字符）
    return_path: (0, pg_core_1.text)('return_path').default('/'), // 登录后返回路径（改为text类型，不限长度）
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(), // 创建时间
    expires_at: (0, pg_core_1.timestamp)('expires_at').notNull() // 过期时间（15分钟后）
});
// 15.6 登录成功临时session表 (login_success_sessions) - 解决LINE浏览器token传递问题
exports.loginSuccessSessionsTable = (0, pg_core_1.pgTable)('login_success_sessions', {
    line_id: (0, pg_core_1.varchar)('line_id', { length: 255 }).primaryKey(),
    token: (0, pg_core_1.text)('token').notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    expires_at: (0, pg_core_1.timestamp)('expires_at').notNull(),
});
// 16. 积分商城商品表 (reward_items)
exports.rewardItems = (0, pg_core_1.pgTable)('reward_items', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    type: (0, pg_core_1.varchar)('type', { length: 16 }).notNull(), // coupon/virtual/physical/bundle
    title: (0, pg_core_1.text)('title').notNull(), // 商品标题
    title_zh_cn: (0, pg_core_1.text)('title_zh_cn'), // 中文标题
    title_en_us: (0, pg_core_1.text)('title_en_us'), // 英文标题
    title_th_th: (0, pg_core_1.text)('title_th_th'), // 泰文标题
    description: (0, pg_core_1.text)('description'), // 商品描述
    description_zh_cn: (0, pg_core_1.text)('description_zh_cn'),
    description_en_us: (0, pg_core_1.text)('description_en_us'),
    description_th_th: (0, pg_core_1.text)('description_th_th'),
    cover: (0, pg_core_1.text)('cover'), // 封面图URL
    images: (0, pg_core_1.json)('images'), // 轮播图JSON数组
    points_cost: (0, pg_core_1.integer)('points_cost').notNull(), // 积分价格
    cash_price: (0, pg_core_1.decimal)('cash_price', { precision: 10, scale: 2 }), // 现金价格（可选，混合支付）
    cost: (0, pg_core_1.decimal)('cost', { precision: 10, scale: 2 }), // 成本（运营隐藏字段）
    stock: (0, pg_core_1.integer)('stock'), // 库存数量（null表示无限）
    stock_alert: (0, pg_core_1.integer)('stock_alert'), // 库存预警阈值
    attrs: (0, pg_core_1.json)('attrs'), // 商品属性（券模板/有效期等）JSON
    tags: (0, pg_core_1.text)('tags').array(), // 标签数组
    channels: (0, pg_core_1.text)('channels').array(), // 上架渠道 ['H5', 'merchant-xxx', 'city-BKK']
    visibility: (0, pg_core_1.varchar)('visibility', { length: 16 }).default('public'), // public/hidden
    status: (0, pg_core_1.varchar)('status', { length: 16 }).default('draft'), // draft/review/live/archived
    is_active: (0, pg_core_1.boolean)('is_active').default(true), // 是否上架
    sort_order: (0, pg_core_1.integer)('sort_order').default(0), // 排序权重
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// 17. 积分兑换记录表 (reward_redemptions)
exports.rewardRedemptions = (0, pg_core_1.pgTable)('reward_redemptions', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    user_id: (0, pg_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    item_id: (0, pg_core_1.bigint)('item_id', { mode: 'number' }).notNull().references(() => exports.rewardItems.id),
    points_cost: (0, pg_core_1.integer)('points_cost').notNull(), // 兑换花费的积分
    cash_paid: (0, pg_core_1.decimal)('cash_paid', { precision: 10, scale: 2 }), // 支付的现金（混合支付）
    status: (0, pg_core_1.varchar)('status', { length: 16 }).default('success').notNull(), // created/processing/success/failed/canceled
    payload: (0, pg_core_1.json)('payload'), // 券码/物流信息/第三方响应等
    channel: (0, pg_core_1.varchar)('channel', { length: 32 }), // 兑换渠道 H5/miniapp/merchant-xxx
    fail_reason: (0, pg_core_1.text)('fail_reason'), // 失败原因
    store_id: (0, pg_core_1.bigint)('store_id', { mode: 'number' }).references(() => exports.stores.id), // 到店自提门店ID
    operator_id: (0, pg_core_1.bigint)('operator_id', { mode: 'number' }), // 操作员ID（售后/人工处理）
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
}, (table) => ({
    idx_reward_redemptions_user: (0, pg_core_1.uniqueIndex)('idx_reward_redemptions_user').on(table.user_id, table.created_at)
}));
// 18. 券码池表 (coupon_codes) - 用于券类商品的码池管理
exports.couponCodes = (0, pg_core_1.pgTable)('coupon_codes', {
    id: (0, pg_core_1.bigserial)('id', { mode: 'number' }).primaryKey(),
    item_id: (0, pg_core_1.bigint)('item_id', { mode: 'number' }).notNull().references(() => exports.rewardItems.id, { onDelete: 'cascade' }),
    code: (0, pg_core_1.text)('code').notNull(), // 券码
    expire_at: (0, pg_core_1.timestamp)('expire_at'), // 券码过期时间
    status: (0, pg_core_1.varchar)('status', { length: 16 }).default('idle').notNull(), // idle/used/locked/invalid
    used_by: (0, pg_core_1.bigint)('used_by', { mode: 'number' }).references(() => exports.users.id), // 使用者ID
    used_at: (0, pg_core_1.timestamp)('used_at'), // 使用时间
    redemption_id: (0, pg_core_1.bigint)('redemption_id', { mode: 'number' }).references(() => exports.rewardRedemptions.id), // 关联的兑换记录
    meta: (0, pg_core_1.json)('meta'), // 额外元数据
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
}, (table) => ({
    unique_item_code: (0, pg_core_1.uniqueIndex)('unique_item_code').on(table.item_id, table.code)
}));
// 内容管理表关联关系
exports.postsRelations = (0, drizzle_orm_1.relations)(exports.posts, ({ one, many }) => ({
    coupon: one(exports.coupons, {
        fields: [exports.posts.coupon_id],
        references: [exports.coupons.id]
    }),
    author: one(exports.admins, {
        fields: [exports.posts.author_id],
        references: [exports.admins.id]
    }),
    likes: many(exports.postLikes),
    comments: many(exports.postComments),
    favorites: many(exports.postFavorites),
    views: many(exports.postViews),
    conversions: many(exports.postConversions)
}));
// 内容点赞关联关系
exports.postLikesRelations = (0, drizzle_orm_1.relations)(exports.postLikes, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.postLikes.user_id],
        references: [exports.users.id]
    }),
    post: one(exports.posts, {
        fields: [exports.postLikes.post_id],
        references: [exports.posts.id]
    })
}));
// 内容收藏关联关系
exports.postFavoritesRelations = (0, drizzle_orm_1.relations)(exports.postFavorites, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.postFavorites.user_id],
        references: [exports.users.id]
    }),
    post: one(exports.posts, {
        fields: [exports.postFavorites.post_id],
        references: [exports.posts.id]
    })
}));
// 内容评论关联关系
exports.postCommentsRelations = (0, drizzle_orm_1.relations)(exports.postComments, ({ one, many }) => ({
    user: one(exports.users, {
        fields: [exports.postComments.user_id],
        references: [exports.users.id]
    }),
    post: one(exports.posts, {
        fields: [exports.postComments.post_id],
        references: [exports.posts.id]
    }),
    parent: one(exports.postComments, {
        fields: [exports.postComments.parent_id],
        references: [exports.postComments.id],
        relationName: 'parent_comment'
    }),
    replies: many(exports.postComments, {
        relationName: 'parent_comment'
    })
}));
// 内容浏览记录关联关系
exports.postViewsRelations = (0, drizzle_orm_1.relations)(exports.postViews, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.postViews.user_id],
        references: [exports.users.id]
    }),
    post: one(exports.posts, {
        fields: [exports.postViews.post_id],
        references: [exports.posts.id]
    })
}));
// 视频播放统计关联关系
exports.videoPlayStatsRelations = (0, drizzle_orm_1.relations)(exports.videoPlayStats, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.videoPlayStats.user_id],
        references: [exports.users.id]
    }),
    post: one(exports.posts, {
        fields: [exports.videoPlayStats.post_id],
        references: [exports.posts.id]
    })
}));
// 内容转化记录关联关系
exports.postConversionsRelations = (0, drizzle_orm_1.relations)(exports.postConversions, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.postConversions.user_id],
        references: [exports.users.id]
    }),
    post: one(exports.posts, {
        fields: [exports.postConversions.post_id],
        references: [exports.posts.id]
    })
}));
// 用户收藏关联关系
exports.userFavoritesRelations = (0, drizzle_orm_1.relations)(exports.userFavorites, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.userFavorites.user_id],
        references: [exports.users.id]
    }),
    coupon: one(exports.coupons, {
        fields: [exports.userFavorites.coupon_id],
        references: [exports.coupons.id]
    })
}));
// 积分记录关联关系
exports.pointTransactionsRelations = (0, drizzle_orm_1.relations)(exports.pointTransactions, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.pointTransactions.user_id],
        references: [exports.users.id]
    }),
    relatedCoupon: one(exports.coupons, {
        fields: [exports.pointTransactions.related_coupon_id],
        references: [exports.coupons.id]
    }),
    bucket: one(exports.pointBuckets, {
        fields: [exports.pointTransactions.bucket_id],
        references: [exports.pointBuckets.id]
    })
}));
// 积分批次关联关系
exports.pointBucketsRelations = (0, drizzle_orm_1.relations)(exports.pointBuckets, ({ one, many }) => ({
    user: one(exports.users, {
        fields: [exports.pointBuckets.user_id],
        references: [exports.users.id]
    }),
    transactions: many(exports.pointTransactions)
}));
// 积分商城商品关联关系
exports.rewardItemsRelations = (0, drizzle_orm_1.relations)(exports.rewardItems, ({ many }) => ({
    redemptions: many(exports.rewardRedemptions),
    couponCodes: many(exports.couponCodes)
}));
// 积分兑换记录关联关系
exports.rewardRedemptionsRelations = (0, drizzle_orm_1.relations)(exports.rewardRedemptions, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.rewardRedemptions.user_id],
        references: [exports.users.id]
    }),
    item: one(exports.rewardItems, {
        fields: [exports.rewardRedemptions.item_id],
        references: [exports.rewardItems.id]
    }),
    store: one(exports.stores, {
        fields: [exports.rewardRedemptions.store_id],
        references: [exports.stores.id]
    })
}));
// 券码池关联关系
exports.couponCodesRelations = (0, drizzle_orm_1.relations)(exports.couponCodes, ({ one }) => ({
    item: one(exports.rewardItems, {
        fields: [exports.couponCodes.item_id],
        references: [exports.rewardItems.id]
    }),
    usedBy: one(exports.users, {
        fields: [exports.couponCodes.used_by],
        references: [exports.users.id]
    }),
    redemption: one(exports.rewardRedemptions, {
        fields: [exports.couponCodes.redemption_id],
        references: [exports.rewardRedemptions.id]
    })
}));
// 导出分析表
__exportStar(require("./analytics"), exports);
