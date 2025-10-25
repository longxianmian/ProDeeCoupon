const omise = require('omise')({
  publicKey: process.env.OMISE_PUBLIC_KEY,
  secretKey: process.env.OMISE_SECRET_KEY
});

class OpnPaymentsService {
  async createCharge({ amount, currency = 'THB', description, returnUri, metadata = {} }) {
    try {
      const charge = await omise.charges.create({
        amount: Math.round(amount * 100),
        currency,
        description,
        return_uri: returnUri,
        metadata
      });
      
      return {
        success: true,
        charge
      };
    } catch (error) {
      console.error('Opn Payments创建支付失败:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async createInternetBankingCharge({ amount, currency = 'THB', description, returnUri, metadata = {} }) {
    try {
      const source = await omise.sources.create({
        type: 'internet_banking_bay',
        amount: Math.round(amount * 100),
        currency
      });

      const charge = await omise.charges.create({
        amount: Math.round(amount * 100),
        currency,
        description,
        return_uri: returnUri,
        source: source.id,
        metadata
      });

      return {
        success: true,
        charge,
        source
      };
    } catch (error) {
      console.error('Opn Payments创建网银支付失败:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async createPromptPayCharge({ amount, currency = 'THB', description, returnUri, metadata = {} }) {
    try {
      const source = await omise.sources.create({
        type: 'promptpay',
        amount: Math.round(amount * 100),
        currency
      });

      const charge = await omise.charges.create({
        amount: Math.round(amount * 100),
        currency,
        description,
        return_uri: returnUri,
        source: source.id,
        metadata
      });

      return {
        success: true,
        charge,
        source,
        qr_code_url: source.scannable_code?.image
      };
    } catch (error) {
      console.error('Opn Payments创建PromptPay支付失败:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async createTrueMoneyCharge({ amount, currency = 'THB', description, returnUri, phoneNumber, metadata = {} }) {
    try {
      const source = await omise.sources.create({
        type: 'truemoney',
        amount: Math.round(amount * 100),
        currency,
        phone_number: phoneNumber
      });

      const charge = await omise.charges.create({
        amount: Math.round(amount * 100),
        currency,
        description,
        return_uri: returnUri,
        source: source.id,
        metadata
      });

      return {
        success: true,
        charge,
        source
      };
    } catch (error) {
      console.error('Opn Payments创建TrueMoney支付失败:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async createTokenCharge({ amount, currency = 'THB', description, returnUri, token, metadata = {} }) {
    try {
      const charge = await omise.charges.create({
        amount: Math.round(amount * 100),
        currency,
        description,
        return_uri: returnUri,
        card: token,
        metadata
      });

      return {
        success: true,
        charge
      };
    } catch (error) {
      console.error('Opn Payments创建Token支付失败:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async getCharge(chargeId) {
    try {
      const charge = await omise.charges.retrieve(chargeId);
      return {
        success: true,
        charge
      };
    } catch (error) {
      console.error('Opn Payments查询支付失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async refundCharge(chargeId, amount = null) {
    try {
      const refund = await omise.charges.refund(chargeId, {
        amount: amount ? Math.round(amount * 100) : undefined
      });

      return {
        success: true,
        refund
      };
    } catch (error) {
      console.error('Opn Payments退款失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.OMISE_SECRET_KEY);
    hmac.update(JSON.stringify(payload));
    const calculatedSignature = hmac.digest('hex');
    
    return calculatedSignature === signature;
  }

  isChargeSuccessful(charge) {
    return charge.status === 'successful' || charge.paid === true;
  }

  isChargePending(charge) {
    return charge.status === 'pending';
  }

  isChargeFailed(charge) {
    return charge.status === 'failed';
  }

  formatAmount(amount) {
    return (amount / 100).toFixed(2);
  }
}

module.exports = new OpnPaymentsService();
