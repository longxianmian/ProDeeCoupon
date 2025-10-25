const express = require('express');
const router = express.Router();
const { db } = require('../storage');
const { paymentOrders, paymentTransactions, rewardRedemptions, rewardItems, users } = require('../../shared/schema');
const { eq, and, sql } = require('drizzle-orm');
const opnPayments = require('../services/omise');
const { verifyToken } = require('../middleware/auth');

function pickUserId(req, res) {
  if (process.env.DEV_SKIP_AUTH === '1') {
    return req.query.user_id ? parseInt(req.query.user_id) : req.user?.userId;
  }
  return req.user?.userId;
}

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD${timestamp}${random}`;
}

router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const { item_id, payment_method = 'promptpay', phone_number } = req.body;
    const userId = pickUserId(req, res);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!item_id) {
      return res.status(400).json({ success: false, error: 'item_id is required' });
    }

    const [item] = await db
      .select()
      .from(rewardItems)
      .where(eq(rewardItems.id, item_id))
      .limit(1);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (!item.cash_price) {
      return res.status(400).json({ success: false, error: 'Item does not support cash payment' });
    }

    if (!item.is_active) {
      return res.status(400).json({ success: false, error: 'Item is not available' });
    }

    if (item.stock !== null && item.stock <= 0) {
      return res.status(400).json({ success: false, error: 'Out of stock' });
    }

    const orderNumber = generateOrderNumber();
    const amount = parseFloat(item.cash_price);
    const currency = 'THB';
    const returnUri = `${process.env.REPLIT_DEV_DOMAIN || 'https://prodee.replit.app'}/payment/callback`;

    const [order] = await db
      .insert(paymentOrders)
      .values({
        user_id: userId,
        item_id: item.id,
        order_number: orderNumber,
        amount,
        currency,
        status: 'pending',
        payment_method,
        provider: 'omise',
        return_url: returnUri,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        metadata: {
          item_title: item.title,
          item_type: item.type
        },
        expired_at: new Date(Date.now() + 30 * 60 * 1000)
      })
      .returning();

    let chargeResult;
    const description = `ProDee - ${item.title}`;
    const metadata = {
      order_number: orderNumber,
      user_id: userId.toString(),
      item_id: item.id.toString()
    };

    switch (payment_method) {
      case 'promptpay':
        chargeResult = await opnPayments.createPromptPayCharge({
          amount,
          currency,
          description,
          returnUri,
          metadata
        });
        break;
      
      case 'truemoney':
        if (!phone_number) {
          return res.status(400).json({ success: false, error: 'phone_number is required for TrueMoney' });
        }
        chargeResult = await opnPayments.createTrueMoneyCharge({
          amount,
          currency,
          description,
          returnUri,
          phoneNumber: phone_number,
          metadata
        });
        break;
      
      case 'internet_banking':
        chargeResult = await opnPayments.createInternetBankingCharge({
          amount,
          currency,
          description,
          returnUri,
          metadata
        });
        break;
      
      default:
        return res.status(400).json({ success: false, error: 'Unsupported payment method' });
    }

    if (!chargeResult.success) {
      await db
        .update(paymentOrders)
        .set({
          status: 'failed',
          updated_at: new Date()
        })
        .where(eq(paymentOrders.id, order.id));

      return res.status(500).json({
        success: false,
        error: 'Failed to create payment',
        details: chargeResult.error
      });
    }

    await db
      .update(paymentOrders)
      .set({
        provider_charge_id: chargeResult.charge.id,
        provider_response: chargeResult.charge,
        status: 'processing',
        updated_at: new Date()
      })
      .where(eq(paymentOrders.id, order.id));

    await db.insert(paymentTransactions).values({
      order_id: order.id,
      transaction_type: 'charge',
      provider: 'omise',
      provider_transaction_id: chargeResult.charge.id,
      amount,
      currency,
      status: chargeResult.charge.status,
      provider_response: chargeResult.charge
    });

    res.json({
      success: true,
      data: {
        order_id: order.id,
        order_number: orderNumber,
        amount,
        currency,
        status: 'processing',
        charge_id: chargeResult.charge.id,
        authorize_uri: chargeResult.charge.authorize_uri,
        qr_code_url: chargeResult.qr_code_url,
        payment_method
      }
    });
  } catch (error) {
    console.error('创建支付订单失败:', error);
    res.status(500).json({ success: false, error: 'Failed to create payment order' });
  }
});

router.get('/order/:order_number', verifyToken, async (req, res) => {
  try {
    const { order_number } = req.params;
    const userId = pickUserId(req, res);

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(
        and(
          eq(paymentOrders.order_number, order_number),
          eq(paymentOrders.user_id, userId)
        )
      )
      .limit(1);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.provider_charge_id && order.status === 'processing') {
      const chargeResult = await opnPayments.getCharge(order.provider_charge_id);
      
      if (chargeResult.success) {
        const charge = chargeResult.charge;
        let newStatus = order.status;
        
        if (opnPayments.isChargeSuccessful(charge)) {
          newStatus = 'completed';
        } else if (opnPayments.isChargeFailed(charge)) {
          newStatus = 'failed';
        }

        if (newStatus !== order.status) {
          await db
            .update(paymentOrders)
            .set({
              status: newStatus,
              paid_at: opnPayments.isChargeSuccessful(charge) ? new Date() : null,
              provider_response: charge,
              updated_at: new Date()
            })
            .where(eq(paymentOrders.id, order.id));
          
          order.status = newStatus;
        }
      }
    }

    res.json({
      success: true,
      data: {
        order_number: order.order_number,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        payment_method: order.payment_method,
        created_at: order.created_at,
        paid_at: order.paid_at
      }
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    res.status(500).json({ success: false, error: 'Failed to get order' });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-omise-signature'];
    const payload = JSON.parse(req.body.toString());

    if (!opnPayments.verifyWebhookSignature(payload, signature)) {
      console.error('Webhook signature verification failed');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    if (payload.key !== 'charge.complete') {
      return res.json({ received: true });
    }

    const charge = payload.data;
    
    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.provider_charge_id, charge.id))
      .limit(1);

    if (!order) {
      console.error('Order not found for charge:', charge.id);
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status === 'completed') {
      return res.json({ received: true, message: 'Already processed' });
    }

    const isSuccess = opnPayments.isChargeSuccessful(charge);
    const newStatus = isSuccess ? 'completed' : 'failed';

    await db
      .update(paymentOrders)
      .set({
        status: newStatus,
        paid_at: isSuccess ? new Date() : null,
        provider_response: charge,
        updated_at: new Date()
      })
      .where(eq(paymentOrders.id, order.id));

    await db.insert(paymentTransactions).values({
      order_id: order.id,
      transaction_type: 'charge',
      provider: 'omise',
      provider_transaction_id: charge.id,
      amount: order.amount,
      currency: order.currency,
      status: isSuccess ? 'successful' : 'failed',
      failure_code: charge.failure_code,
      failure_message: charge.failure_message,
      provider_response: charge
    });

    if (isSuccess) {
      const [item] = await db
        .select()
        .from(rewardItems)
        .where(eq(rewardItems.id, order.item_id))
        .limit(1);

      if (item) {
        let payload = {
          payment_order_id: order.id,
          paid_at: new Date().toISOString()
        };

        if (item.type === 'coupon') {
          const couponCode = `PC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          payload.coupon_code = couponCode;
          payload.valid_days = item.attrs?.valid_days || 30;
          payload.expires_at = new Date(Date.now() + (item.attrs?.valid_days || 30) * 24 * 60 * 60 * 1000).toISOString();
        } else if (item.type === 'virtual') {
          const redeemCode = `PV${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
          payload.redeem_code = redeemCode;
          payload.vendor = item.attrs?.vendor || 'default';
        }

        const [redemption] = await db
          .insert(rewardRedemptions)
          .values({
            user_id: order.user_id,
            item_id: order.item_id,
            points_cost: 0,
            cash_paid: order.amount,
            status: 'success',
            payload,
            channel: 'cash_payment'
          })
          .returning();

        await db
          .update(paymentOrders)
          .set({
            redemption_id: redemption.id,
            updated_at: new Date()
          })
          .where(eq(paymentOrders.id, order.id));

        if (item.stock !== null) {
          await db
            .update(rewardItems)
            .set({
              stock: sql`stock - 1`
            })
            .where(eq(rewardItems.id, item.id));
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook处理失败:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

router.post('/refund', verifyToken, async (req, res) => {
  try {
    const { order_number, amount } = req.body;
    const userId = pickUserId(req, res);

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(
        and(
          eq(paymentOrders.order_number, order_number),
          eq(paymentOrders.user_id, userId)
        )
      )
      .limit(1);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Order is not completed' });
    }

    if (!order.provider_charge_id) {
      return res.status(400).json({ success: false, error: 'No charge ID found' });
    }

    const refundResult = await opnPayments.refundCharge(
      order.provider_charge_id,
      amount ? parseFloat(amount) : null
    );

    if (!refundResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process refund',
        details: refundResult.error
      });
    }

    await db
      .update(paymentOrders)
      .set({
        status: 'refunded',
        refunded_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(paymentOrders.id, order.id));

    await db.insert(paymentTransactions).values({
      order_id: order.id,
      transaction_type: 'refund',
      provider: 'omise',
      provider_transaction_id: refundResult.refund.id,
      amount: amount ? parseFloat(amount) : order.amount,
      currency: order.currency,
      status: 'successful',
      provider_response: refundResult.refund
    });

    res.json({
      success: true,
      data: {
        order_number: order.order_number,
        refund_amount: amount ? parseFloat(amount) : order.amount,
        refund_id: refundResult.refund.id
      }
    });
  } catch (error) {
    console.error('退款失败:', error);
    res.status(500).json({ success: false, error: 'Failed to process refund' });
  }
});

module.exports = router;
