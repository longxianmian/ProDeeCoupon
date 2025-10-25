import { pgTable, bigserial, varchar, text, decimal, integer, timestamp, pgEnum, char, bigint, boolean, json, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// 枚举类型定义
export const couponStatusEnum = pgEnum('coupon_status', ['claimed', 'used', 'expired'])
export const contactMethodEnum = pgEnum('contact_method', ['line_id', 'phone', 'email'])
export const bindingStatusEnum = pgEnum('binding_status', ['pending', 'bound', 'inactive'])
export const couponTypeEnum = pgEnum('coupon_type', ['final_price', 'gift_card', 'cash_voucher', 'full_reduction', 'percentage_discount', 'fixed_discount'])
export const categoryEnum = pgEnum('category', ['recommend', '3c', 'fashion', 'food', 'beauty', 'nails', 'mom'])
export const postTypeEnum = pgEnum('post_type', ['video', 'article'])
export const postStatusEnum = pgEnum('post_status', ['draft', 'published', 'archived'])
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused'])

// 1. 用户表 (users)
export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  line_id: varchar('line_id', { length: 100 }).unique(),
  facebook_user_id: varchar('facebook_user_id', { length: 100 }).unique(),
  nickname: varchar('nickname', { length: 100 }),
  avatar: varchar('avatar', { length: 500 }),
  is_following: boolean('is_following').default(false),
  language: varchar('language', { length: 10 }).default('zh-cn'),
  points: integer('points').default(0), // 用户积分
  level: integer('level').default(1), // 用户等级 L1, L2, L3...
  province: varchar('province', { length: 50 }).default('bangkok'), // 用户所在省份
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 2. 门店表 (stores)
export const stores = pgTable('stores', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  address: varchar('address', { length: 500 }).notNull(),
  // 多语言字段
  name_zh_cn: varchar('name_zh_cn', { length: 200 }),
  name_en_us: varchar('name_en_us', { length: 200 }),
  name_th_th: varchar('name_th_th', { length: 200 }),
  address_zh_cn: varchar('address_zh_cn', { length: 500 }),
  address_en_us: varchar('address_en_us', { length: 500 }),
  address_th_th: varchar('address_th_th', { length: 500 }),
  city: varchar('city', { length: 100 }), // 城市
  lat: decimal('lat', { precision: 10, scale: 8 }),
  lng: decimal('lng', { precision: 11, scale: 8 }),
  image_url: varchar('image_url', { length: 500 }),
  code: varchar('code', { length: 50 }).unique(),
  google_place_id: varchar('google_place_id', { length: 200 }), // Google Place ID
  rating: decimal('rating', { precision: 3, scale: 2 }), // 评分 (0.00-5.00)
  opening_hours: text('opening_hours'), // 营业时间JSON格式
  phone: varchar('phone', { length: 50 }), // 电话号码
  website: varchar('website', { length: 500 }), // 网站
  status: varchar('status', { length: 20 }).default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 3. 优惠券活动表 (coupons)
export const coupons = pgTable('coupons', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  // 多语言字段
  title_zh_cn: varchar('title_zh_cn', { length: 200 }),
  title_en_us: varchar('title_en_us', { length: 200 }),
  title_th_th: varchar('title_th_th', { length: 200 }),
  description_zh_cn: text('description_zh_cn'),
  description_en_us: text('description_en_us'),
  description_th_th: text('description_th_th'),
  image_url: varchar('image_url', { length: 500 }), // 保留向后兼容
  media_files: json('media_files'), // 新增：多媒体文件JSON数组 [{type: 'image'|'video', url: string, filename: string, size: number}]
  
  // 券类型系统
  coupon_type: couponTypeEnum('coupon_type').default('final_price').notNull(),
  category: categoryEnum('category').default('recommend').notNull(), // 行业类目
  
  // 原有价格字段（向后兼容，现在可选）
  original_price: decimal('original_price', { precision: 10, scale: 2 }),
  discount_price: decimal('discount_price', { precision: 10, scale: 2 }),
  
  // 新的灵活价格字段
  price_final: decimal('price_final', { precision: 10, scale: 2 }), // 最终价格
  face_value: decimal('face_value', { precision: 10, scale: 2 }), // 面值（礼品券）
  amount_off: decimal('amount_off', { precision: 10, scale: 2 }), // 抵用/减免金额
  min_spend: decimal('min_spend', { precision: 10, scale: 2 }), // 最低消费金额
  discount_percent: decimal('discount_percent', { precision: 5, scale: 2 }), // 折扣百分比 (0.00-100.00)
  cap_amount: decimal('cap_amount', { precision: 10, scale: 2 }), // 折扣封顶金额
  currency: varchar('currency', { length: 3 }).default('CNY'), // 货币代码
  
  quantity: integer('quantity').notNull(),
  claimed_count: integer('claimed_count').default(0),
  redeemed_count: integer('redeemed_count').default(0),
  valid_from: timestamp('valid_from').notNull(),
  valid_to: timestamp('valid_to').notNull(),
  status: varchar('status', { length: 20 }).default('draft'), // draft, active, paused
  
  // 员工操作指引字段
  staff_sop: text('staff_sop'), // 员工操作指南/SOP（Standard Operating Procedure）
  staff_notes: text('staff_notes'), // 员工注意事项
  
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 4. 优惠券-门店关联表 (coupon_stores)
export const couponStores = pgTable('coupon_stores', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  coupon_id: bigint('coupon_id', { mode: 'number' }).notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  store_id: bigint('store_id', { mode: 'number' }).notNull().references(() => stores.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull()
})

// 5. 用户优惠券记录表 (user_coupons)
export const userCoupons = pgTable('user_coupons', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  coupon_id: bigint('coupon_id', { mode: 'number' }).notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  redemption_code: char('redemption_code', { length: 6 }).notNull().unique(),
  qr_code_data: text('qr_code_data').notNull(),
  status: couponStatusEnum('status').default('claimed').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(), // 领取时间
  redeemed_at: timestamp('redeemed_at'), // 核销时间
  expires_at: timestamp('expires_at').notNull() // 过期时间（从优惠券活动复制）
})

// 6. 核销记录表 (redemptions)
export const redemptions = pgTable('redemptions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_coupon_id: bigint('user_coupon_id', { mode: 'number' }).notNull().references(() => userCoupons.id, { onDelete: 'cascade' }),
  store_id: bigint('store_id', { mode: 'number' }).notNull().references(() => stores.id),
  verifier_id: bigint('verifier_id', { mode: 'number' }).references(() => users.id), // 核销员（用户表中的LINE ID）
  verification_method: varchar('verification_method', { length: 20 }).default('qrcode'), // qrcode, manual
  redeemed_at: timestamp('redeemed_at').defaultNow().notNull(),
  notes: text('notes') // 核销备注
})

// 7. 员工预设表 (staff_presets) - 管理员预设员工信息
export const staffPresets = pgTable('staff_presets', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  store_id: bigint('store_id', { mode: 'number' }).notNull().references(() => stores.id, { onDelete: 'cascade' }),
  staff_id: varchar('staff_id', { length: 50 }).notNull(), // 员工工号
  name: varchar('name', { length: 100 }).notNull(), // 员工姓名
  phone: varchar('phone', { length: 20 }), // 员工LINE绑定电话（用于验证）- 临时可选以避免数据丢失
  department: varchar('department', { length: 100 }), // 部门（可选）
  position: varchar('position', { length: 100 }), // 职位（可选）
  status: varchar('status', { length: 20 }).default('active'), // active, inactive
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // 确保每个门店内员工工号唯一
  unique_store_staff: uniqueIndex('unique_store_staff_id').on(table.store_id, table.staff_id),
}))

// 8. 员工绑定表 (staff_bindings) - LINE User ID绑定记录
export const staffBindings = pgTable('staff_bindings', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  preset_id: bigint('preset_id', { mode: 'number' }).notNull().references(() => staffPresets.id, { onDelete: 'cascade' }),
  line_user_id: varchar('line_user_id', { length: 50 }).unique(), // LINE User ID (U开头的32位)
  display_name: varchar('display_name', { length: 100 }), // LINE显示名称（仅记录，不用于验证）
  binding_status: bindingStatusEnum('binding_status').default('pending').notNull(),
  bound_at: timestamp('bound_at'), // 绑定时间
  last_active_at: timestamp('last_active_at'), // 最后活跃时间
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 7. 核销员授权表 (verifiers) - 保留兼容性，暂时废弃
export const verifiers = pgTable('verifiers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  store_id: bigint('store_id', { mode: 'number' }).notNull().references(() => stores.id, { onDelete: 'cascade' }),
  contact_method: contactMethodEnum('contact_method').default('line_id').notNull(), // 联系方式类型
  line_id: varchar('line_id', { length: 100 }), // 店员LINE ID (可为空)
  phone: varchar('phone', { length: 50 }), // 手机号码 (可为空)
  email: varchar('email', { length: 200 }), // 邮箱地址 (可为空)
  name: varchar('name', { length: 100 }).notNull(), // 店员姓名
  status: varchar('status', { length: 20 }).default('active'), // active, inactive
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 8. 管理员表 (admins)
export const admins = pgTable('admins', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: varchar('email', { length: 200 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('admin'), // 'super_admin' | 'content_operator'
  display_name: varchar('display_name', { length: 100 }), // 对外显示名称（如：PreDee小美）
  avatar: varchar('avatar', { length: 500 }), // 头像URL
  department: varchar('department', { length: 100 }), // 所属部门
  is_active: boolean('is_active').default(true), // 账号状态
  created_by: bigint('created_by', { mode: 'number' }), // 创建者ID（超级管理员）
  status: varchar('status', { length: 20 }).default('active'),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 关系定义
export const usersRelations = relations(users, ({ many }) => ({
  userCoupons: many(userCoupons),
  redemptions: many(redemptions, { relationName: 'verifierRedemptions' }),
  favorites: many(userFavorites),
  pointTransactions: many(pointTransactions),
  pointBuckets: many(pointBuckets),
  rewardRedemptions: many(rewardRedemptions)
}))

export const storesRelations = relations(stores, ({ many }) => ({
  couponStores: many(couponStores),
  redemptions: many(redemptions),
  verifiers: many(verifiers),
  staffPresets: many(staffPresets)
}))

export const couponsRelations = relations(coupons, ({ many }) => ({
  userCoupons: many(userCoupons),
  couponStores: many(couponStores),
  favorites: many(userFavorites),
  pointTransactions: many(pointTransactions)
}))

export const couponStoresRelations = relations(couponStores, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponStores.coupon_id],
    references: [coupons.id]
  }),
  store: one(stores, {
    fields: [couponStores.store_id],
    references: [stores.id]
  })
}))

export const userCouponsRelations = relations(userCoupons, ({ one, many }) => ({
  user: one(users, {
    fields: [userCoupons.user_id],
    references: [users.id]
  }),
  coupon: one(coupons, {
    fields: [userCoupons.coupon_id],
    references: [coupons.id]
  }),
  redemptions: many(redemptions)
}))

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  userCoupon: one(userCoupons, {
    fields: [redemptions.user_coupon_id],
    references: [userCoupons.id]
  }),
  store: one(stores, {
    fields: [redemptions.store_id],
    references: [stores.id]
  }),
  verifier: one(users, {
    fields: [redemptions.verifier_id],
    references: [users.id],
    relationName: 'verifierRedemptions'
  })
}))

export const verifiersRelations = relations(verifiers, ({ one }) => ({
  store: one(stores, {
    fields: [verifiers.store_id],
    references: [stores.id]
  })
}))

export const staffPresetsRelations = relations(staffPresets, ({ one, many }) => ({
  store: one(stores, {
    fields: [staffPresets.store_id],
    references: [stores.id]
  }),
  bindings: many(staffBindings)
}))

export const staffBindingsRelations = relations(staffBindings, ({ one }) => ({
  preset: one(staffPresets, {
    fields: [staffBindings.preset_id],
    references: [staffPresets.id]
  })
}))

// Rich Menu配置表 - 存储LINE Rich Menu ID
export const richMenuConfigs = pgTable('rich_menu_configs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  menu_type: varchar('menu_type', { length: 20 }).notNull(), // user, staff
  menu_name: varchar('menu_name', { length: 100 }).notNull(),
  rich_menu_id: varchar('rich_menu_id', { length: 100 }).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  uniqueMenuType: uniqueIndex('rich_menu_configs_menu_type_unique').on(table.menu_type)
}))

// 7. 内容管理表 (posts)
export const posts = pgTable('posts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  type: postTypeEnum('type').notNull(), // 'video' | 'article'
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content'),
  // 多语言字段
  title_zh_cn: varchar('title_zh_cn', { length: 200 }),
  title_en_us: varchar('title_en_us', { length: 200 }),
  title_th_th: varchar('title_th_th', { length: 200 }),
  content_zh_cn: text('content_zh_cn'),
  content_en_us: text('content_en_us'),
  content_th_th: text('content_th_th'),
  // 媒体文件 - 存储为JSON数组 [{type: 'image'|'video', url: string, filename: string}]
  media_files: json('media_files'),
  // 状态管理
  status: postStatusEnum('status').default('draft').notNull(),
  // 关联优惠券（可选）
  coupon_id: bigint('coupon_id', { mode: 'number' }),
  // 活动绑定字段
  activity_id: bigint('activity_id', { mode: 'number' }), // 绑定的活动ID
  cta_type: varchar('cta_type', { length: 50 }), // 按钮类型：coupon, groupbuy, detail
  cta_text: varchar('cta_text', { length: 100 }), // 自定义按钮文案
  cta_link: varchar('cta_link', { length: 500 }), // 自定义按钮链接
  // 定时发布字段
  publish_at: timestamp('publish_at'),
  // 多语言翻译字段
  translations: json('translations'),
  // 封面图片（视频专用）
  poster: varchar('poster', { length: 500 }),
  // 统计字段
  likes_count: integer('likes_count').default(0),
  comments_count: integer('comments_count').default(0),
  views_count: integer('views_count').default(0),
  shares_count: integer('shares_count').default(0),
  favorites_count: integer('favorites_count').default(0),
  // 置顶和排序字段
  is_pinned: boolean('is_pinned').default(false).notNull(), // 是否置顶
  sort_order: integer('sort_order').default(0), // 排序权重（越大越靠前）
  hot_score: decimal('hot_score', { precision: 10, scale: 2 }).default('0'), // 热度分数
  // 作者字段（改为引用admins表 - 内容由管理员/员工创建）
  author_id: bigint('author_id', { mode: 'number' }).references(() => admins.id, { onDelete: 'set null' }),
  // 发布时间
  published_at: timestamp('published_at'),
  // 创建和更新时间
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 8. 内容点赞表 (post_likes)
export const postLikes = pgTable('post_likes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  post_id: bigint('post_id', { mode: 'number' }).notNull().references(() => posts.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // 确保用户对同一个内容只能点赞一次
  unique_user_post: uniqueIndex('unique_user_post_like').on(table.user_id, table.post_id),
}))

// 9. 内容评论表 (post_comments)
export const postComments = pgTable('post_comments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  post_id: bigint('post_id', { mode: 'number' }).notNull().references(() => posts.id, { onDelete: 'cascade' }),
  parent_id: bigint('parent_id', { mode: 'number' }).references(() => postComments.id, { onDelete: 'cascade' }), // 回复功能
  content: text('content').notNull(),
  // 多语言字段
  content_zh_cn: text('content_zh_cn'),
  content_en_us: text('content_en_us'),
  content_th_th: text('content_th_th'),
  status: varchar('status', { length: 20 }).default('approved').notNull(), // approved, pending, rejected
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 9.5. 内容收藏表 (post_favorites)
export const postFavorites = pgTable('post_favorites', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  post_id: bigint('post_id', { mode: 'number' }).notNull().references(() => posts.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // 确保用户对同一个内容只能收藏一次
  unique_user_post_favorite: uniqueIndex('unique_user_post_favorite').on(table.user_id, table.post_id),
}))

// 10. 内容浏览记录表 (post_views) - 防止重复计数
export const postViews = pgTable('post_views', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }),
  post_id: bigint('post_id', { mode: 'number' }).notNull().references(() => posts.id, { onDelete: 'cascade' }),
  session_id: varchar('session_id', { length: 100 }),
  ip_address: varchar('ip_address', { length: 50 }),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  user_post_idx: uniqueIndex('post_views_user_post_idx').on(table.user_id, table.post_id, table.created_at)
}))

// 10.5. 视频播放统计表 (video_play_stats) - 记录视频播放详细数据
export const videoPlayStats = pgTable('video_play_stats', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }),
  post_id: bigint('post_id', { mode: 'number' }).notNull().references(() => posts.id, { onDelete: 'cascade' }),
  session_id: varchar('session_id', { length: 100 }), // 会话ID，用于匿名用户
  play_duration: integer('play_duration').default(0), // 播放时长（秒）
  video_duration: integer('video_duration'), // 视频总时长（秒）
  completion_rate: decimal('completion_rate', { precision: 5, scale: 2 }), // 完播率（0-100）
  is_completed: boolean('is_completed').default(false), // 是否完整播放
  source: varchar('source', { length: 50 }).default('feed'), // 来源：feed, detail, share
  created_at: timestamp('created_at').defaultNow().notNull()
})

// 11. 内容转化记录表 (post_conversions) - 追踪从内容到领券的转化
export const postConversions = pgTable('post_conversions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  post_id: bigint('post_id', { mode: 'number' }).notNull().references(() => posts.id, { onDelete: 'cascade' }),
  activity_id: bigint('activity_id', { mode: 'number' }),
  conversion_type: varchar('conversion_type', { length: 50 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
})

// 12. 用户收藏表 (user_favorites)
export const userFavorites = pgTable('user_favorites', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  coupon_id: bigint('coupon_id', { mode: 'number' }).notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // 确保用户对同一个优惠券只能收藏一次
  unique_user_coupon: uniqueIndex('unique_user_coupon_favorite').on(table.user_id, table.coupon_id),
}))

// 13. 积分记录表 (point_transactions) - 扩展字段
export const pointTransactions = pgTable('point_transactions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // 'earn' | 'spend' | 'expire' | 'admin_adjust'
  amount: integer('amount').notNull(), // 正数为获得，负数为消费
  description: varchar('description', { length: 200 }).notNull(), // 积分变动说明
  related_coupon_id: bigint('related_coupon_id', { mode: 'number' }), // 关联的优惠券ID（可选）
  status: varchar('status', { length: 16 }).default('posted').notNull(), // pending/posted/reversed
  idempotency_key: varchar('idempotency_key', { length: 64 }).unique(), // 幂等性键
  reason_code: varchar('reason_code', { length: 32 }), // signup/checkin/order_pay/redeem/refund等
  order_id: bigint('order_id', { mode: 'number' }), // 关联订单ID
  bucket_id: bigint('bucket_id', { mode: 'number' }), // 关联积分批次ID
  metadata: json('metadata'), // 额外元数据（JSON格式）
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  idx_pt_user_created: uniqueIndex('idx_pt_user_created').on(table.user_id, table.created_at)
}))

// 14. 积分批次表 (point_buckets) - 用于过期管理与FIFO扣减
export const pointBuckets = pgTable('point_buckets', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  earned: integer('earned').notNull(), // 原始获得积分数
  remaining: integer('remaining').notNull(), // 剩余可用积分
  reason_code: varchar('reason_code', { length: 32 }).notNull(), // 获得原因
  source_id: bigint('source_id', { mode: 'number' }), // 来源ID（订单/活动等）
  expire_at: timestamp('expire_at').notNull(), // 过期时间
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  idx_pb_user_exp: uniqueIndex('idx_pb_user_exp').on(table.user_id, table.expire_at)
}))

// 15. 积分规则配置表 (point_rules) - 可配置的业务规则
export const pointRules = pgTable('point_rules', {
  key: text('key').primaryKey(), // 规则键名
  value: text('value').notNull() // 规则值
})

// 15.5 PKCE会话存储表 (pkce_sessions) - 用于LINE登录OAuth流程
export const pkceSessions = pgTable('pkce_sessions', {
  state: varchar('state', { length: 256 }).primaryKey(), // OAuth state参数，用作主键（扩展到256字符以支持长路径）
  code_verifier: varchar('code_verifier', { length: 256 }).notNull(), // PKCE code_verifier（扩展到256字符）
  nonce: varchar('nonce', { length: 128 }).notNull(), // OpenID nonce（扩展到128字符）
  return_path: text('return_path').default('/'), // 登录后返回路径（改为text类型，不限长度）
  created_at: timestamp('created_at').defaultNow().notNull(), // 创建时间
  expires_at: timestamp('expires_at').notNull() // 过期时间（15分钟后）
})

// 15.6 登录成功临时session表 (login_success_sessions) - 解决LINE浏览器token传递问题
export const loginSuccessSessionsTable = pgTable('login_success_sessions', {
  line_id: varchar('line_id', { length: 255 }).primaryKey(),
  token: text('token').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  expires_at: timestamp('expires_at').notNull(),
})

// 16. 积分商城商品表 (reward_items)
export const rewardItems = pgTable('reward_items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  type: varchar('type', { length: 16 }).notNull(), // coupon/virtual/physical/bundle
  category: varchar('category', { length: 32 }).default('recommended'), // recommended/fashion/food/beauty/home/electronics/kids/education
  title: text('title').notNull(), // 商品标题
  title_zh_cn: text('title_zh_cn'), // 中文标题
  title_en_us: text('title_en_us'), // 英文标题
  title_th_th: text('title_th_th'), // 泰文标题
  description: text('description'), // 商品描述
  description_zh_cn: text('description_zh_cn'),
  description_en_us: text('description_en_us'),
  description_th_th: text('description_th_th'),
  cover: text('cover'), // 封面图URL
  images: json('images'), // 轮播图JSON数组
  points_cost: integer('points_cost').notNull(), // 积分价格
  cash_price: decimal('cash_price', { precision: 10, scale: 2 }), // 现金价格（可选，混合支付）
  cost: decimal('cost', { precision: 10, scale: 2 }), // 成本（运营隐藏字段）
  stock: integer('stock'), // 库存数量（null表示无限）
  stock_alert: integer('stock_alert'), // 库存预警阈值
  attrs: json('attrs'), // 商品属性（券模板/有效期等）JSON
  tags: text('tags').array(), // 标签数组
  channels: text('channels').array(), // 上架渠道 ['H5', 'merchant-xxx', 'city-BKK']
  visibility: varchar('visibility', { length: 16 }).default('public'), // public/hidden
  status: varchar('status', { length: 16 }).default('draft'), // draft/review/live/archived
  is_active: boolean('is_active').default(true), // 是否上架
  sort_order: integer('sort_order').default(0), // 排序权重
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 17. 积分兑换记录表 (reward_redemptions)
export const rewardRedemptions = pgTable('reward_redemptions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  item_id: bigint('item_id', { mode: 'number' }).notNull().references(() => rewardItems.id),
  points_cost: integer('points_cost').notNull(), // 兑换花费的积分
  cash_paid: decimal('cash_paid', { precision: 10, scale: 2 }), // 支付的现金（混合支付）
  status: varchar('status', { length: 16 }).default('success').notNull(), // created/processing/success/failed/canceled
  payload: json('payload'), // 券码/物流信息/第三方响应等
  channel: varchar('channel', { length: 32 }), // 兑换渠道 H5/miniapp/merchant-xxx
  fail_reason: text('fail_reason'), // 失败原因
  store_id: bigint('store_id', { mode: 'number' }).references(() => stores.id), // 到店自提门店ID
  operator_id: bigint('operator_id', { mode: 'number' }), // 操作员ID（售后/人工处理）
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  idx_reward_redemptions_user: uniqueIndex('idx_reward_redemptions_user').on(table.user_id, table.created_at)
}))

// 18. 券码池表 (coupon_codes) - 用于券类商品的码池管理
export const couponCodes = pgTable('coupon_codes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  item_id: bigint('item_id', { mode: 'number' }).notNull().references(() => rewardItems.id, { onDelete: 'cascade' }),
  code: text('code').notNull(), // 券码
  expire_at: timestamp('expire_at'), // 券码过期时间
  status: varchar('status', { length: 16 }).default('idle').notNull(), // idle/used/locked/invalid
  used_by: bigint('used_by', { mode: 'number' }).references(() => users.id), // 使用者ID
  used_at: timestamp('used_at'), // 使用时间
  redemption_id: bigint('redemption_id', { mode: 'number' }).references(() => rewardRedemptions.id), // 关联的兑换记录
  meta: json('meta'), // 额外元数据
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  unique_item_code: uniqueIndex('unique_item_code').on(table.item_id, table.code)
}))

// 19. 支付订单表 (payment_orders)
export const paymentOrders = pgTable('payment_orders', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  redemption_id: bigint('redemption_id', { mode: 'number' }).references(() => rewardRedemptions.id),
  item_id: bigint('item_id', { mode: 'number' }).notNull().references(() => rewardItems.id),
  order_number: varchar('order_number', { length: 64 }).notNull().unique(), // 订单号
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(), // 应付金额
  currency: varchar('currency', { length: 3 }).default('THB').notNull(), // 货币
  status: varchar('status', { length: 32 }).default('pending').notNull(), // pending/processing/completed/failed/refunded
  payment_method: varchar('payment_method', { length: 32 }), // credit_card/promptpay/truemoney/etc
  provider: varchar('provider', { length: 32 }).default('omise'), // omise/stripe
  provider_charge_id: varchar('provider_charge_id', { length: 128 }), // Omise Charge ID
  provider_response: json('provider_response'), // 完整的支付网关响应
  return_url: text('return_url'), // 支付完成后跳转URL
  webhook_url: text('webhook_url'), // webhook回调URL
  ip_address: varchar('ip_address', { length: 50 }), // 用户IP
  user_agent: text('user_agent'), // 用户UA
  metadata: json('metadata'), // 额外元数据
  expired_at: timestamp('expired_at'), // 订单过期时间
  paid_at: timestamp('paid_at'), // 支付完成时间
  refunded_at: timestamp('refunded_at'), // 退款时间
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  idx_payment_orders_user: uniqueIndex('idx_payment_orders_user').on(table.user_id, table.created_at),
  idx_payment_orders_order_number: uniqueIndex('idx_payment_orders_order_number').on(table.order_number)
}))

// 20. 支付流水表 (payment_transactions)
export const paymentTransactions = pgTable('payment_transactions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  order_id: bigint('order_id', { mode: 'number' }).notNull().references(() => paymentOrders.id, { onDelete: 'cascade' }),
  transaction_type: varchar('transaction_type', { length: 32 }).notNull(), // charge/refund/capture/void
  provider: varchar('provider', { length: 32 }).notNull(), // omise/stripe
  provider_transaction_id: varchar('provider_transaction_id', { length: 128 }), // Omise Transaction ID
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('THB').notNull(),
  status: varchar('status', { length: 32 }).notNull(), // pending/successful/failed
  failure_code: varchar('failure_code', { length: 64 }), // 失败代码
  failure_message: text('failure_message'), // 失败信息
  provider_response: json('provider_response'), // 完整响应
  created_at: timestamp('created_at').defaultNow().notNull()
})

// 内容管理表关联关系
export const postsRelations = relations(posts, ({ one, many }) => ({
  coupon: one(coupons, {
    fields: [posts.coupon_id],
    references: [coupons.id]
  }),
  author: one(admins, {
    fields: [posts.author_id],
    references: [admins.id]
  }),
  likes: many(postLikes),
  comments: many(postComments),
  favorites: many(postFavorites),
  views: many(postViews),
  conversions: many(postConversions)
}))

// 内容点赞关联关系
export const postLikesRelations = relations(postLikes, ({ one }) => ({
  user: one(users, {
    fields: [postLikes.user_id],
    references: [users.id]
  }),
  post: one(posts, {
    fields: [postLikes.post_id],
    references: [posts.id]
  })
}))

// 内容收藏关联关系
export const postFavoritesRelations = relations(postFavorites, ({ one }) => ({
  user: one(users, {
    fields: [postFavorites.user_id],
    references: [users.id]
  }),
  post: one(posts, {
    fields: [postFavorites.post_id],
    references: [posts.id]
  })
}))

// 内容评论关联关系
export const postCommentsRelations = relations(postComments, ({ one, many }) => ({
  user: one(users, {
    fields: [postComments.user_id],
    references: [users.id]
  }),
  post: one(posts, {
    fields: [postComments.post_id],
    references: [posts.id]
  }),
  parent: one(postComments, {
    fields: [postComments.parent_id],
    references: [postComments.id],
    relationName: 'parent_comment'
  }),
  replies: many(postComments, {
    relationName: 'parent_comment'
  })
}))

// 内容浏览记录关联关系
export const postViewsRelations = relations(postViews, ({ one }) => ({
  user: one(users, {
    fields: [postViews.user_id],
    references: [users.id]
  }),
  post: one(posts, {
    fields: [postViews.post_id],
    references: [posts.id]
  })
}))

// 视频播放统计关联关系
export const videoPlayStatsRelations = relations(videoPlayStats, ({ one }) => ({
  user: one(users, {
    fields: [videoPlayStats.user_id],
    references: [users.id]
  }),
  post: one(posts, {
    fields: [videoPlayStats.post_id],
    references: [posts.id]
  })
}))

// 内容转化记录关联关系
export const postConversionsRelations = relations(postConversions, ({ one }) => ({
  user: one(users, {
    fields: [postConversions.user_id],
    references: [users.id]
  }),
  post: one(posts, {
    fields: [postConversions.post_id],
    references: [posts.id]
  })
}))

// 用户收藏关联关系
export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.user_id],
    references: [users.id]
  }),
  coupon: one(coupons, {
    fields: [userFavorites.coupon_id],
    references: [coupons.id]
  })
}))

// 积分记录关联关系
export const pointTransactionsRelations = relations(pointTransactions, ({ one }) => ({
  user: one(users, {
    fields: [pointTransactions.user_id],
    references: [users.id]
  }),
  relatedCoupon: one(coupons, {
    fields: [pointTransactions.related_coupon_id],
    references: [coupons.id]
  }),
  bucket: one(pointBuckets, {
    fields: [pointTransactions.bucket_id],
    references: [pointBuckets.id]
  })
}))

// 积分批次关联关系
export const pointBucketsRelations = relations(pointBuckets, ({ one, many }) => ({
  user: one(users, {
    fields: [pointBuckets.user_id],
    references: [users.id]
  }),
  transactions: many(pointTransactions)
}))

// 积分商城商品关联关系
export const rewardItemsRelations = relations(rewardItems, ({ many }) => ({
  redemptions: many(rewardRedemptions),
  couponCodes: many(couponCodes)
}))

// 积分兑换记录关联关系
export const rewardRedemptionsRelations = relations(rewardRedemptions, ({ one }) => ({
  user: one(users, {
    fields: [rewardRedemptions.user_id],
    references: [users.id]
  }),
  item: one(rewardItems, {
    fields: [rewardRedemptions.item_id],
    references: [rewardItems.id]
  }),
  store: one(stores, {
    fields: [rewardRedemptions.store_id],
    references: [stores.id]
  })
}))

// 券码池关联关系
export const couponCodesRelations = relations(couponCodes, ({ one }) => ({
  item: one(rewardItems, {
    fields: [couponCodes.item_id],
    references: [rewardItems.id]
  }),
  usedBy: one(users, {
    fields: [couponCodes.used_by],
    references: [users.id]
  }),
  redemption: one(rewardRedemptions, {
    fields: [couponCodes.redemption_id],
    references: [rewardRedemptions.id]
  })
}))

// 支付订单关联关系
export const paymentOrdersRelations = relations(paymentOrders, ({ one, many }) => ({
  user: one(users, {
    fields: [paymentOrders.user_id],
    references: [users.id]
  }),
  redemption: one(rewardRedemptions, {
    fields: [paymentOrders.redemption_id],
    references: [rewardRedemptions.id]
  }),
  item: one(rewardItems, {
    fields: [paymentOrders.item_id],
    references: [rewardItems.id]
  }),
  transactions: many(paymentTransactions)
}))

// 支付流水关联关系
export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  order: one(paymentOrders, {
    fields: [paymentTransactions.order_id],
    references: [paymentOrders.id]
  })
}))

// 导出类型
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Store = typeof stores.$inferSelect
export type NewStore = typeof stores.$inferInsert
export type Coupon = typeof coupons.$inferSelect
export type NewCoupon = typeof coupons.$inferInsert
export type UserCoupon = typeof userCoupons.$inferSelect
export type NewUserCoupon = typeof userCoupons.$inferInsert
export type Redemption = typeof redemptions.$inferSelect
export type NewRedemption = typeof redemptions.$inferInsert
export type Verifier = typeof verifiers.$inferSelect
export type NewVerifier = typeof verifiers.$inferInsert
export type StaffPreset = typeof staffPresets.$inferSelect
export type NewStaffPreset = typeof staffPresets.$inferInsert
export type StaffBinding = typeof staffBindings.$inferSelect
export type NewStaffBinding = typeof staffBindings.$inferInsert
export type Admin = typeof admins.$inferSelect
export type NewAdmin = typeof admins.$inferInsert
export type RichMenuConfig = typeof richMenuConfigs.$inferSelect
export type NewRichMenuConfig = typeof richMenuConfigs.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type PostLike = typeof postLikes.$inferSelect
export type NewPostLike = typeof postLikes.$inferInsert
export type PostComment = typeof postComments.$inferSelect
export type NewPostComment = typeof postComments.$inferInsert
export type PostView = typeof postViews.$inferSelect
export type NewPostView = typeof postViews.$inferInsert
export type PostConversion = typeof postConversions.$inferSelect
export type NewPostConversion = typeof postConversions.$inferInsert
export type UserFavorite = typeof userFavorites.$inferSelect
export type NewUserFavorite = typeof userFavorites.$inferInsert
export type PointTransaction = typeof pointTransactions.$inferSelect
export type NewPointTransaction = typeof pointTransactions.$inferInsert
export type PointBucket = typeof pointBuckets.$inferSelect
export type NewPointBucket = typeof pointBuckets.$inferInsert
export type PointRule = typeof pointRules.$inferSelect
export type NewPointRule = typeof pointRules.$inferInsert
export type RewardItem = typeof rewardItems.$inferSelect
export type NewRewardItem = typeof rewardItems.$inferInsert
export type RewardRedemption = typeof rewardRedemptions.$inferSelect
export type NewRewardRedemption = typeof rewardRedemptions.$inferInsert
export type CouponCode = typeof couponCodes.$inferSelect
export type NewCouponCode = typeof couponCodes.$inferInsert
export type PaymentOrder = typeof paymentOrders.$inferSelect
export type NewPaymentOrder = typeof paymentOrders.$inferInsert
export type PaymentTransaction = typeof paymentTransactions.$inferSelect
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert
export type PkceSession = typeof pkceSessions.$inferSelect
export type NewPkceSession = typeof pkceSessions.$inferInsert
export type LoginSuccessSession = typeof loginSuccessSessionsTable.$inferSelect
export type NewLoginSuccessSession = typeof loginSuccessSessionsTable.$inferInsert

// 导出分析表
export * from './analytics'