/**
 * OAuth State 签名和验证工具
 * 实现无状态 state（URL 自携带），不依赖预会话 Cookie
 */

const crypto = require('crypto');

// State 签名密钥（从环境变量读取）
const STATE_SECRET = process.env.AUTH_STATE_SECRET || process.env.JWT_SECRET || 'change-me-in-production';

/**
 * 生成签名的 state
 * 格式：base64url(nonce.expiresAt.returnTo).signature
 * @param {string} returnTo - 登录成功后跳转的页面
 * @param {number} ttlMinutes - 有效期（分钟）
 * @returns {string} 签名后的 state
 */
function generateSignedState(returnTo = '/', ttlMinutes = 5) {
  // 生成随机 nonce（128-bit）
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // 过期时间戳（毫秒）
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  
  // 构造 payload: nonce.expiresAt.returnTo
  const payload = `${nonce}.${expiresAt}.${encodeURIComponent(returnTo)}`;
  
  // Base64URL 编码 payload
  const encodedPayload = Buffer.from(payload).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // 计算 HMAC 签名
  const signature = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(encodedPayload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // 返回格式：payload.signature
  return `${encodedPayload}.${signature}`;
}

/**
 * 验证签名的 state
 * @param {string} state - 待验证的 state
 * @returns {{valid: boolean, nonce?: string, expiresAt?: number, returnTo?: string, error?: string}}
 */
function verifySignedState(state) {
  try {
    // 分割 payload 和 signature
    const parts = state.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid state format' };
    }
    
    const [encodedPayload, signature] = parts;
    
    // 验证签名
    const expectedSignature = crypto
      .createHmac('sha256', STATE_SECRET)
      .update(encodedPayload)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    // 解码 payload
    const payload = Buffer.from(encodedPayload, 'base64').toString('utf8');
    const payloadParts = payload.split('.');
    
    if (payloadParts.length !== 3) {
      return { valid: false, error: 'Invalid payload format' };
    }
    
    const [nonce, expiresAtStr, encodedReturnTo] = payloadParts;
    const expiresAt = parseInt(expiresAtStr, 10);
    const returnTo = decodeURIComponent(encodedReturnTo);
    
    // 检查是否过期
    if (Date.now() > expiresAt) {
      return { valid: false, error: 'State expired' };
    }
    
    return {
      valid: true,
      nonce,
      expiresAt,
      returnTo
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * 生成高强度随机 code_verifier（PKCE）
 * @returns {string} code_verifier（64字节，128字符十六进制）
 */
function generateCodeVerifier() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * 计算 code_challenge（PKCE）
 * @param {string} codeVerifier 
 * @returns {string} Base64URL 编码的 SHA256 哈希
 */
function generateCodeChallenge(codeVerifier) {
  return crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

module.exports = {
  generateSignedState,
  verifySignedState,
  generateCodeVerifier,
  generateCodeChallenge
};
