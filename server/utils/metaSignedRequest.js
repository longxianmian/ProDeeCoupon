const crypto = require('crypto');

/**
 * 解析并验证 Meta (Facebook/Instagram) 的 signed_request
 * @param {string} signedRequest - 签名请求字符串
 * @param {string} appSecret - Meta App Secret
 * @returns {Object} 解析后的payload
 * @throws {Error} 如果签名无效或格式错误
 */
function parseSignedRequest(signedRequest, appSecret) {
  if (!signedRequest || !appSecret) {
    throw new Error('INVALID_SIGNED_REQUEST: Missing parameters');
  }

  const parts = String(signedRequest).split('.', 2);
  if (parts.length !== 2) {
    throw new Error('INVALID_SIGNED_REQUEST: Invalid format');
  }

  const [encodedSig, encodedPayload] = parts;

  // Base64 URL 解码辅助函数
  const base64UrlDecode = (str) => {
    // 替换 URL 安全字符
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // 补齐 padding
    while (base64.length % 4) {
      base64 += '=';
    }
    return base64;
  };

  try {
    // 解码签名
    const sig = Buffer.from(base64UrlDecode(encodedSig), 'base64');
    
    // 解码 payload
    const payloadBuffer = Buffer.from(base64UrlDecode(encodedPayload), 'base64');
    const payload = JSON.parse(payloadBuffer.toString('utf8'));

    // 验证签名
    const expected = crypto
      .createHmac('sha256', appSecret)
      .update(encodedPayload)
      .digest();

    if (!crypto.timingSafeEqual(sig, expected)) {
      throw new Error('BAD_SIGNATURE: Signature verification failed');
    }

    return payload; // { user_id, issued_at, algorithm, ... }
  } catch (error) {
    if (error.message.startsWith('BAD_SIGNATURE')) {
      throw error;
    }
    throw new Error('INVALID_SIGNED_REQUEST: ' + error.message);
  }
}

module.exports = {
  parseSignedRequest
};
