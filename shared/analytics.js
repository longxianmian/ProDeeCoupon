"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.events = exports.sessions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// 会话表 - 记录用户访问会话和来源归因信息
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.varchar)('id', { length: 64 }).primaryKey(), // session_id（uuid）
    userHash: (0, pg_core_1.varchar)('user_hash', { length: 128 }).notNull(), // sha256(line userId) 或 'anon'
    isLine: (0, pg_core_1.boolean)('is_line').notNull().default(false),
    province: (0, pg_core_1.varchar)('province', { length: 64 }),
    lang: (0, pg_core_1.varchar)('lang', { length: 16 }),
    utmSource: (0, pg_core_1.varchar)('utm_source', { length: 128 }),
    utmMedium: (0, pg_core_1.varchar)('utm_medium', { length: 128 }),
    utmCampaign: (0, pg_core_1.varchar)('utm_campaign', { length: 128 }),
    utmContent: (0, pg_core_1.varchar)('utm_content', { length: 128 }),
    utmTerm: (0, pg_core_1.varchar)('utm_term', { length: 128 }),
    menuId: (0, pg_core_1.varchar)('menu_id', { length: 64 }), // LINE OA 菜单id/版本
    slot: (0, pg_core_1.varchar)('slot', { length: 64 }), // 菜单槽位
    referrer: (0, pg_core_1.varchar)('referrer', { length: 512 }),
    ua: (0, pg_core_1.varchar)('ua', { length: 512 }),
    ipCountry: (0, pg_core_1.varchar)('ip_country', { length: 2 }),
    channel: (0, pg_core_1.varchar)('channel', { length: 32 }), // 标准化渠道：line/tiktok/facebook/instagram/…
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }).defaultNow(),
    lastSeenAt: (0, pg_core_1.timestamp)('last_seen_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    idxSource: (0, pg_core_1.index)('idx_sessions_source').on(t.utmSource, t.utmMedium, t.utmCampaign),
    idxProvince: (0, pg_core_1.index)('idx_sessions_province').on(t.province),
    idxChannel: (0, pg_core_1.index)('idx_sessions_channel').on(t.channel), // 新索引
}));
// 事件表 - 记录用户行为事件
exports.events = (0, pg_core_1.pgTable)('events', {
    id: (0, pg_core_1.varchar)('id', { length: 64 }).primaryKey(), // 事件id（客户端生成，防重）
    sessionId: (0, pg_core_1.varchar)('session_id', { length: 64 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 64 }).notNull(), // page_view/detail_view/claim_ok/redeem_ok ...
    route: (0, pg_core_1.varchar)('route', { length: 128 }),
    contentId: (0, pg_core_1.varchar)('content_id', { length: 64 }), // 内容/卡片id（可空）
    campaignId: (0, pg_core_1.varchar)('campaign_id', { length: 64 }), // 活动/券id（可空）
    value: (0, pg_core_1.integer)('value'), // 数值（如视频进度%）
    meta: (0, pg_core_1.jsonb)('meta'),
    occurredAt: (0, pg_core_1.timestamp)('occurred_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    idxTypeTime: (0, pg_core_1.index)('idx_events_type_time').on(t.type, t.occurredAt),
    idxSession: (0, pg_core_1.index)('idx_events_session').on(t.sessionId),
    idxContent: (0, pg_core_1.index)('idx_events_content').on(t.contentId),
}));
