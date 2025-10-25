const express = require('express');
const crypto = require('crypto');
const { db } = require('../storage');
const { sql } = require('drizzle-orm');
const { detectChannel } = require('../utils/detectChannel');

// 导入表定义
const { 
  sessions, 
  events
} = require('../../shared/schema');

const router = express.Router();

// 1) 采集埋点 —— 支持单条或数组
router.post('/analytics/track', async (req, res) => {
  try {
    const batch = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const e of batch) {
      const sid = e.session?.id || crypto.randomUUID();
      const userHash = e.session?.userHash || 'anon';

      const channel = detectChannel({
        utm_source: e.session?.utm_source,
        referrer:   e.session?.referrer,
        is_line:    !!e.session?.is_line,
        ua:         e.ua,
        query:      e.session?.query,
      });

      // upsert session（写/更新 channel）- 使用原始SQL避免Drizzle问题
      await db.execute(sql`
        INSERT INTO sessions (id, user_hash, is_line, province, lang, utm_source, utm_medium, utm_campaign, utm_content, utm_term, menu_id, slot, referrer, ua, channel, started_at, last_seen_at)
        VALUES (${sid}, ${userHash}, ${!!e.session?.is_line}, ${e.session?.province || null}, ${e.session?.lang || null}, ${e.session?.utm_source || null}, ${e.session?.utm_medium || null}, ${e.session?.utm_campaign || null}, ${e.session?.utm_content || null}, ${e.session?.utm_term || null}, ${e.session?.menu_id || null}, ${e.session?.slot || null}, ${e.session?.referrer || null}, ${e.ua || ''}, ${channel}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          last_seen_at = NOW(),
          channel = ${channel}
      `);

      // 写事件 - 使用原始SQL避免Drizzle问题
      await db.execute(sql`
        INSERT INTO events (id, session_id, type, route, content_id, campaign_id, value, meta, occurred_at)
        VALUES (${e.id || crypto.randomUUID()}, ${sid}, ${e.type}, ${e.route || null}, ${e.content_id || null}, ${e.campaign_id || null}, ${e.value || null}, ${e.meta || null}, NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    }
    
    res.sendStatus(204);
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.sendStatus(500);
  }
});

// 聚合通用 where 片段
function buildFilter(q) {
  let clauses = [];
  if (q.province) clauses.push(sql`s.province = ${q.province}`);
  if (q.lang) clauses.push(sql`s.lang = ${q.lang}`);
  if (q.channel) clauses.push(sql`s.channel = ${q.channel}`);
  
  return clauses.length > 0 ? sql` AND ${sql.join(clauses, sql` AND `)}` : sql``;
}

// 2) 概览（按渠道聚合）
router.get('/admin/analytics/overview', async (req, res) => {
  try {
    const q = req.query;
    const groupBy = 'channel'; // 固定按渠道
    const range = sql`e.occurred_at between ${q.from} and ${q.to}`;
    const filter = buildFilter(q);
    const evtFilter = q.campaign_id ? sql` AND e.campaign_id = ${q.campaign_id}` : sql``;

    const rows = await db.execute(sql`
      WITH base AS (
        SELECT s.channel as key,
               e.session_id,
               e.type
        FROM events e
        JOIN sessions s ON s.id = e.session_id
        WHERE ${range} ${filter} ${evtFilter}
      )
      SELECT key,
        count(DISTINCT session_id) FILTER (WHERE type = 'detail_view')  as sessions,
        count(DISTINCT session_id) FILTER (WHERE type = 'claim_ok')     as claims,
        count(DISTINCT session_id) FILTER (WHERE type = 'redeem_ok')    as redeems
      FROM base
      GROUP BY key
      ORDER BY key NULLS LAST
    `);
    
    res.json(rows.rows || rows);
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3) 日趋势（详情/领取/核销）
router.get('/admin/analytics/daily', async (req, res) => {
  try {
    const q = req.query;
    const range = sql`e.occurred_at between ${q.from} and ${q.to}`;
    const filter = buildFilter(q);
    const evtFilter = q.campaign_id ? sql` AND e.campaign_id = ${q.campaign_id}` : sql``;

    const rows = await db.execute(sql`
      SELECT date_trunc('day', e.occurred_at) as day,
        count(DISTINCT e.session_id) FILTER (WHERE e.type='detail_view') as sessions,
        count(DISTINCT e.session_id) FILTER (WHERE e.type='claim_ok')    as claims,
        count(DISTINCT e.session_id) FILTER (WHERE e.type='redeem_ok')   as redeems
      FROM events e
      JOIN sessions s ON s.id = e.session_id
      WHERE ${range} ${filter} ${evtFilter}
      GROUP BY 1
      ORDER BY 1
    `);
    
    res.json(rows.rows || rows);
  } catch (error) {
    console.error('Analytics daily error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4) 活动下拉（最近有数据的活动）
router.get('/admin/analytics/dicts/campaigns', async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT e.campaign_id as id,
             COALESCE(e.campaign_id,'') as name,
             count(*) FILTER (WHERE e.type='detail_view') as views
      FROM events e
      WHERE e.campaign_id IS NOT NULL
      GROUP BY 1,2
      ORDER BY views DESC NULLS LAST
      LIMIT 200
    `);
    
    res.json({ campaigns: rows.rows || rows });
  } catch (error) {
    console.error('Analytics campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;