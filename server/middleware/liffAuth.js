const lineService = require('../services/lineService');
const jwt = require('jsonwebtoken');

/**
 * LIFF认证中间件 - 验证LIFF ID Token并检查关注状态
 */
const authenticateLiff = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Missing LIFF ID Token',
        code: 'MISSING_TOKEN'
      });
    }

    const idToken = authHeader.substring(7);
    
    // 验证LIFF ID Token
    const verificationResult = await lineService.verifyLiffIdToken(idToken);
    
    if (!verificationResult.success) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid LIFF ID Token',
        code: 'INVALID_TOKEN'
      });
    }

    // 将验证后的用户信息添加到请求对象
    req.liffUser = {
      userId: verificationResult.userId,
      name: verificationResult.name,
      picture: verificationResult.picture,
      email: verificationResult.email
    };

    console.log('✅ LIFF认证成功:', req.liffUser.userId);
    next();
  } catch (error) {
    console.error('❌ LIFF认证失败:', error);
    res.status(401).json({ 
      success: false, 
      error: 'LIFF authentication failed',
      message: error.message,
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * LIFF认证 + 关注状态检查中间件
 */
const authenticateLiffWithFollow = async (req, res, next) => {
  try {
    // 首先进行LIFF认证
    await new Promise((resolve, reject) => {
      authenticateLiff(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    if (!req.liffUser) {
      return; // 认证失败，前面已经返回了错误响应
    }

    // 检查关注状态
    const followResult = await lineService.getUserFollowStatus(req.liffUser.userId);
    
    if (!followResult.success) {
      return res.status(403).json({
        success: false,
        error: 'Unable to verify follow status',
        code: 'FOLLOW_CHECK_FAILED',
        message: '无法验证关注状态，请确保您已关注我们的官方账号'
      });
    }

    if (!followResult.isFollowing) {
      return res.status(403).json({
        success: false,
        error: 'User not following',
        code: 'NOT_FOLLOWING',
        message: '请先关注我们的LINE官方账号才能领取优惠券'
      });
    }

    // 添加关注状态到请求对象
    req.liffUser.isFollowing = true;
    req.liffUser.followStatus = followResult;

    console.log('✅ LIFF认证 + 关注检查成功:', req.liffUser.userId);
    next();
  } catch (error) {
    console.error('❌ LIFF认证 + 关注检查失败:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication with follow check failed',
      message: error.message,
      code: 'AUTH_FOLLOW_FAILED'
    });
  }
};

/**
 * 可选的LIFF认证中间件 - 不强制要求认证
 */
const optionalLiffAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 没有认证信息，但不阻止请求继续
      req.liffUser = null;
      return next();
    }

    const idToken = authHeader.substring(7);
    
    try {
      const verificationResult = await lineService.verifyLiffIdToken(idToken);
      
      if (verificationResult.success) {
        req.liffUser = {
          userId: verificationResult.userId,
          name: verificationResult.name,
          picture: verificationResult.picture,
          email: verificationResult.email
        };
        console.log('✅ 可选LIFF认证成功:', req.liffUser.userId);
      } else {
        req.liffUser = null;
      }
    } catch (error) {
      console.warn('⚠️ 可选LIFF认证失败，继续处理请求:', error.message);
      req.liffUser = null;
    }

    next();
  } catch (error) {
    console.error('❌ 可选LIFF认证异常:', error);
    req.liffUser = null;
    next();
  }
};

module.exports = {
  authenticateLiff,
  authenticateLiffWithFollow,
  optionalLiffAuth
};