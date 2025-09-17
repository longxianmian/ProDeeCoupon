const { pgTable, bigserial, varchar, text, decimal, integer, timestamp, pgEnum, char, bigint, boolean, json, uniqueIndex } = require('drizzle-orm/pg-core')
const { relations } = require('drizzle-orm')

// 枚举类型定义
const couponStatusEnum = pgEnum('coupon_status', ['claimed', 'used', 'expired'])
const contactMethodEnum = pgEnum('contact_method', ['line_id', 'phone', 'email'])
const bindingStatusEnum = pgEnum('binding_status', ['pending', 'bound', 'inactive'])
const couponTypeEnum = pgEnum('coupon_type', ['final_price', 'gift_card', 'cash_voucher', 'full_reduction', 'percentage_discount', 'fixed_discount'])

// 1. 用户表 (users)
const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  line_id: varchar('line_id', { length: 100 }).notNull().unique(),
  nickname: varchar('nickname', { length: 100 }),
  avatar: varchar('avatar', { length: 500 }),
  is_following: boolean('is_following').default(false),
  language: varchar('language', { length: 10 }).default('zh-cn'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 2. 门店表 (stores)
const stores = pgTable('stores', {
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
const coupons = pgTable('coupons', {
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
  status: varchar('status', { length: 20 }).default('active'), // active, ended
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// 4. 优惠券-门店关联表 (coupon_stores)
const couponStores = pgTable('coupon_stores', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  coupon_id: bigint('coupon_id', { mode: 'number' }).notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  store_id: bigint('store_id', { mode: 'number' }).notNull().references(() => stores.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull()
})

// 5. 用户优惠券记录表 (user_coupons)
const userCoupons = pgTable('user_coupons', {
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
const redemptions = pgTable('redemptions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_coupon_id: bigint('user_coupon_id', { mode: 'number' }).notNull().references(() => userCoupons.id, { onDelete: 'cascade' }),
  store_id: bigint('store_id', { mode: 'number' }).notNull().references(() => stores.id),
  verifier_id: bigint('verifier_id', { mode: 'number' }).references(() => users.id), // 核销员（用户表中的LINE ID）
  verification_method: varchar('verification_method', { length: 20 }).default('qrcode'), // qrcode, manual
  redeemed_at: timestamp('redeemed_at').defaultNow().notNull(),
  notes: text('notes') // 核销备注
})

// 7. 员工预设表 (staff_presets) - 管理员预设员工信息
const staffPresets = pgTable('staff_presets', {
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
const staffBindings = pgTable('staff_bindings', {
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
const verifiers = pgTable('verifiers', {
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
const admins = pgTable('admins', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: varchar('email', { length: 200 }).notNull().unique(), // 保持原始长度
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('admin'),
  status: varchar('status', { length: 20 }).default('active'),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
})

// Rich Menu配置表 - 存储LINE Rich Menu ID
const richMenuConfigs = pgTable('rich_menu_configs', {
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

// 关系定义
const usersRelations = relations(users, ({ many }) => ({
  userCoupons: many(userCoupons),
  redemptions: many(redemptions, { relationName: 'verifierRedemptions' })
}))

const storesRelations = relations(stores, ({ many }) => ({
  couponStores: many(couponStores),
  redemptions: many(redemptions),
  verifiers: many(verifiers),
  staffPresets: many(staffPresets)
}))

const couponsRelations = relations(coupons, ({ many }) => ({
  userCoupons: many(userCoupons),
  couponStores: many(couponStores)
}))

const couponStoresRelations = relations(couponStores, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponStores.coupon_id],
    references: [coupons.id]
  }),
  store: one(stores, {
    fields: [couponStores.store_id],
    references: [stores.id]
  })
}))

const userCouponsRelations = relations(userCoupons, ({ one, many }) => ({
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

const redemptionsRelations = relations(redemptions, ({ one }) => ({
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

const verifiersRelations = relations(verifiers, ({ one }) => ({
  store: one(stores, {
    fields: [verifiers.store_id],
    references: [stores.id]
  })
}))

const staffPresetsRelations = relations(staffPresets, ({ one, many }) => ({
  store: one(stores, {
    fields: [staffPresets.store_id],
    references: [stores.id]
  }),
  bindings: many(staffBindings)
}))

const staffBindingsRelations = relations(staffBindings, ({ one }) => ({
  preset: one(staffPresets, {
    fields: [staffBindings.preset_id],
    references: [staffPresets.id]
  })
}))

// CommonJS exports
module.exports = {
  // Enums
  couponStatusEnum,
  contactMethodEnum,
  bindingStatusEnum,
  
  // Tables
  users,
  stores,
  coupons,
  couponStores,
  userCoupons,
  redemptions,
  staffPresets,
  staffBindings,
  verifiers,
  admins,
  richMenuConfigs,
  
  // Relations
  usersRelations,
  storesRelations,
  couponsRelations,
  couponStoresRelations,
  userCouponsRelations,
  redemptionsRelations,
  verifiersRelations,
  staffPresetsRelations,
  staffBindingsRelations
}