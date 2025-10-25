const express = require('express');
const router = express.Router();
const { db } = require('../storage');
const { 
  users, 
  pointTransactions, 
  pointBuckets, 
  pointRules 
} = require('../../shared/schema');
const { eq, and, sql, desc, gte, lt } = require('drizzle-orm');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { pickUserId } = require('../utils/safe');

router.get('/balance', optionalAuth, async (req, res) => {
  try {
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.json({
        success: true,
        data: {
          balance: 0,
          level: 1,
          expiring_soon: 0,
          expiring_days: null
        }
      });
    }
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const now = new Date();
    const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const expiringBuckets = await db
      .select({
        month: sql`TO_CHAR(expire_at, 'YYYY-MM')`,
        points: sql`SUM(remaining)`
      })
      .from(pointBuckets)
      .where(
        and(
          eq(pointBuckets.user_id, userId),
          gte(pointBuckets.expire_at, now),
          lt(pointBuckets.expire_at, threeMonthsLater),
          sql`remaining > 0`
        )
      )
      .groupBy(sql`TO_CHAR(expire_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(expire_at, 'YYYY-MM')`);

    const totalExpiring = expiringBuckets.reduce((sum, b) => sum + (parseInt(b.points) || 0), 0);
    const firstExpiringMonth = expiringBuckets[0];
    const daysUntilExpiry = firstExpiringMonth 
      ? Math.ceil((new Date(firstExpiringMonth.month + '-01') - now) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      success: true,
      data: {
        balance: user.points || 0,
        level: user.level || 1,
        expiring_soon: totalExpiring,
        expiring_days: daysUntilExpiry
      }
    });
  } catch (error) {
    console.error('获取积分余额失败:', error);
    res.status(500).json({ success: false, error: 'Failed to get points balance' });
  }
});

router.get('/transactions', verifyToken, async (req, res) => {
  try {
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }
    
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = parseInt(limit) + 1; // 查询多一条以检测是否还有更多

    let whereCondition = eq(pointTransactions.user_id, userId);
    
    if (type && type !== 'all') {
      whereCondition = and(
        eq(pointTransactions.user_id, userId),
        eq(pointTransactions.type, type)
      );
    }

    const transactions = await db
      .select()
      .from(pointTransactions)
      .where(whereCondition)
      .orderBy(desc(pointTransactions.created_at))
      .limit(pageLimit)
      .offset(offset);

    // 检查是否还有更多数据
    const hasMore = transactions.length > parseInt(limit);
    const resultTransactions = hasMore ? transactions.slice(0, -1) : transactions;

    res.json({
      success: true,
      transactions: resultTransactions.map(t => ({
        id: t.id,
        type: t.type,
        points: t.amount,
        description: t.description,
        reason_code: t.reason_code,
        status: t.status,
        created_at: t.created_at
      })),
      hasMore: hasMore,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取积分交易记录失败:', error);
    res.status(500).json({ success: false, error: 'Failed to get transactions' });
  }
});

router.post('/earn', verifyToken, async (req, res) => {
  try {
    const { points, reason_code, source_id, expire_days = 365 } = req.body;
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }
    
    const idempotencyKey = req.headers['idempotency-key'];

    if (!idempotencyKey) {
      return res.status(400).json({ success: false, error: 'Idempotency-Key header required' });
    }

    if (!points || points <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid points amount' });
    }

    if (!reason_code) {
      return res.status(400).json({ success: false, error: 'reason_code is required' });
    }

    const existing = await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.idempotency_key, idempotencyKey))
      .limit(1);

    if (existing.length > 0) {
      return res.json({ 
        success: true,
        message: 'Already processed',
        data: {
          transaction: existing[0]
        }
      });
    }

    const expireAt = new Date(Date.now() + expire_days * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      const [bucket] = await tx
        .insert(pointBuckets)
        .values({
          user_id: userId,
          earned: points,
          remaining: points,
          reason_code,
          source_id: source_id || null,
          expire_at: expireAt
        })
        .returning();

      const [transaction] = await tx
        .insert(pointTransactions)
        .values({
          user_id: userId,
          type: 'earn',
          amount: points,
          description: `获得积分: ${reason_code}`,
          status: 'posted',
          idempotency_key: idempotencyKey,
          reason_code,
          bucket_id: bucket.id
        })
        .returning();

      await tx
        .update(users)
        .set({
          points: sql`points + ${points}`
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        data: {
          transaction,
          bucket
        }
      });
    });
  } catch (error) {
    console.error('发放积分失败:', error);
    res.status(500).json({ success: false, error: 'Failed to earn points' });
  }
});

router.post('/spend', verifyToken, async (req, res) => {
  try {
    const { use_points, order_id } = req.body;
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }
    
    const idempotencyKey = req.headers['idempotency-key'];

    if (!idempotencyKey) {
      return res.status(400).json({ success: false, error: 'Idempotency-Key header required' });
    }

    if (!use_points || use_points <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid points amount' });
    }

    const existing = await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.idempotency_key, idempotencyKey))
      .limit(1);

    if (existing.length > 0) {
      return res.json({ 
        success: true,
        message: 'Already processed',
        data: {
          transaction: existing[0]
        }
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.points < use_points) {
      return res.status(400).json({ success: false, error: 'Insufficient points' });
    }

    await db.transaction(async (tx) => {
      const buckets = await tx
        .select()
        .from(pointBuckets)
        .where(
          and(
            eq(pointBuckets.user_id, userId),
            sql`remaining > 0`
          )
        )
        .orderBy(pointBuckets.expire_at)
        .for('update');

      let remainingToSpend = use_points;
      const bucketsUsed = [];

      for (const bucket of buckets) {
        if (remainingToSpend <= 0) break;

        const toDeduct = Math.min(bucket.remaining, remainingToSpend);
        
        await tx
          .update(pointBuckets)
          .set({
            remaining: bucket.remaining - toDeduct
          })
          .where(eq(pointBuckets.id, bucket.id));

        bucketsUsed.push({
          bucket_id: bucket.id,
          points: toDeduct
        });

        remainingToSpend -= toDeduct;
      }

      const [transaction] = await tx
        .insert(pointTransactions)
        .values({
          user_id: userId,
          type: 'spend',
          amount: -use_points,
          description: `消费积分: ${order_id ? `订单${order_id}` : '商城兑换'}`,
          status: 'posted',
          idempotency_key: idempotencyKey,
          reason_code: 'order_pay',
          order_id: order_id || null,
          metadata: { buckets_used: bucketsUsed }
        })
        .returning();

      await tx
        .update(users)
        .set({
          points: sql`points - ${use_points}`
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        data: {
          transaction
        }
      });
    });
  } catch (error) {
    console.error('消费积分失败:', error);
    res.status(500).json({ success: false, error: 'Failed to spend points' });
  }
});

router.post('/quote', verifyToken, async (req, res) => {
  try {
    const { order_amount_thb, want_use_points } = req.body;
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const rules = await db
      .select()
      .from(pointRules)
      .where(sql`key IN ('redeem.rate', 'order.max_rate', 'order.step')`);

    const rulesMap = {};
    rules.forEach(r => {
      rulesMap[r.key] = r.value;
    });

    const redeemRate = parseInt(rulesMap['redeem.rate']?.replace('pt_per_THB', '')) || 100;
    const maxRate = parseFloat(rulesMap['order.max_rate']) || 0.3;
    const step = parseInt(rulesMap['order.step']) || 100;

    const maxByAmount = Math.floor((order_amount_thb * maxRate) * redeemRate);
    const canUse = Math.min(want_use_points, maxByAmount, user.points);
    const actualUse = Math.floor(canUse / step) * step;
    const discountAmount = actualUse / redeemRate;

    res.json({
      success: true,
      data: {
        can_use_points: actualUse,
        discount_amount: discountAmount,
        max_by_amount: maxByAmount,
        user_balance: user.points,
        rules: {
          redeem_rate: redeemRate,
          max_rate: maxRate,
          step: step
        }
      }
    });
  } catch (error) {
    console.error('积分试算失败:', error);
    res.status(500).json({ success: false, error: 'Failed to quote points' });
  }
});

module.exports = router;
