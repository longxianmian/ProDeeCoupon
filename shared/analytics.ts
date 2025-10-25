import { pgTable, varchar, boolean, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// 会话表 - 记录用户访问会话和来源归因信息
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(), // session_id（uuid）
  userHash: varchar('user_hash', { length: 128 }).notNull(), // sha256(line userId) 或 'anon'
  isLine: boolean('is_line').notNull().default(false),
  province: varchar('province', { length: 64 }),
  lang: varchar('lang', { length: 16 }),
  utmSource: varchar('utm_source', { length: 128 }),
  utmMedium: varchar('utm_medium', { length: 128 }),
  utmCampaign: varchar('utm_campaign', { length: 128 }),
  utmContent: varchar('utm_content', { length: 128 }),
  utmTerm: varchar('utm_term', { length: 128 }),
  menuId: varchar('menu_id', { length: 64 }), // LINE OA 菜单id/版本
  slot: varchar('slot', { length: 64 }), // 菜单槽位
  referrer: varchar('referrer', { length: 512 }),
  ua: varchar('ua', { length: 512 }),
  ipCountry: varchar('ip_country', { length: 2 }),
  channel: varchar('channel', { length: 32 }), // 标准化渠道：line/tiktok/facebook/instagram/…
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  idxSource: index('idx_sessions_source').on(t.utmSource, t.utmMedium, t.utmCampaign),
  idxProvince: index('idx_sessions_province').on(t.province),
  idxChannel: index('idx_sessions_channel').on(t.channel), // 新索引
}));

// 事件表 - 记录用户行为事件
export const events = pgTable('events', {
  id: varchar('id', { length: 64 }).primaryKey(), // 事件id（客户端生成，防重）
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  type: varchar('type', { length: 64 }).notNull(), // page_view/detail_view/claim_ok/redeem_ok ...
  route: varchar('route', { length: 128 }),
  contentId: varchar('content_id', { length: 64 }), // 内容/卡片id（可空）
  campaignId: varchar('campaign_id', { length: 64 }), // 活动/券id（可空）
  value: integer('value'), // 数值（如视频进度%）
  meta: jsonb('meta'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  idxTypeTime: index('idx_events_type_time').on(t.type, t.occurredAt),
  idxSession: index('idx_events_session').on(t.sessionId),
  idxContent: index('idx_events_content').on(t.contentId),
}));

// 导出类型
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;