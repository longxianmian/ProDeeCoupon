const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { dbService } = require('../storage.js');
const { eq } = require('drizzle-orm');
const schema = require('../../shared/schema');

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'prodee_session';

if (!JWT_SECRET) {
  console.warn('⚠️  警告: 未设置 SESSION_SECRET 或 JWT_SECRET，Facebook 登录功能将被禁用');
}

// 生成JWT令牌
const generateToken = (payload) => {
  if (!JWT_SECRET) {
    throw new Error('SESSION_SECRET 未设置，无法生成 token');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};

// 根据 Facebook User ID 查找或创建用户
async function upsertUserWithFacebook(facebookProfile) {
  const { id: facebookUserId, name, picture } = facebookProfile;
  const avatarUrl = picture?.data?.url || '';

  console.log(`🔍 查找 Facebook 用户: ${facebookUserId}`);

  // 查找是否已存在该 Facebook 用户
  const existingUsers = await dbService.database
    .select()
    .from(schema.users)
    .where(eq(schema.users.facebook_user_id, facebookUserId))
    .limit(1);

  if (existingUsers && existingUsers.length > 0) {
    const user = existingUsers[0];
    console.log(`✅ 找到现有 Facebook 用户: ${user.id}`);
    
    // 更新用户信息
    const updatedUser = await dbService.updateUser(user.id, {
      nickname: name || user.nickname,
      avatar: avatarUrl || user.avatar,
      updated_at: new Date()
    });
    
    return updatedUser;
  }

  // 创建新用户
  console.log(`👤 创建新 Facebook 用户: ${facebookUserId}`);
  const newUserData = {
    facebook_user_id: facebookUserId,
    nickname: name || 'Facebook User',
    avatar: avatarUrl,
    is_following: false,
    language: 'zh-cn',
    points: 0,
    level: 1,
    province: 'bangkok'
  };

  const [newUser] = await dbService.createUser(newUserData);
  return newUser;
}

// POST /auth/facebook/callback
// IAB 模式：前端将 FB.authResponse 直接 POST 过来
router.post('/callback', async (req, res) => {
  try {
    // 检查功能是否启用
    const fbLoginEnabled = process.env.FB_LOGIN_ENABLED === 'true';
    if (!fbLoginEnabled) {
      return res.status(503).json({ 
        error: 'SERVICE_UNAVAILABLE',
        message: 'Facebook 登录功能未启用' 
      });
    }

    const { accessToken, userID } = req.body || {};
    if (!accessToken || !userID) {
      console.warn('❌ Facebook callback: 缺少 accessToken 或 userID');
      return res.status(400).json({ 
        error: 'INVALID_PAYLOAD',
        message: '缺少必要的认证参数'
      });
    }

    console.log(`🔐 Facebook 登录回调 - User ID: ${userID}`);

    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('❌ 缺少 FB_APP_ID 或 FB_APP_SECRET 环境变量');
      return res.status(500).json({ 
        error: 'SERVER_CONFIG_ERROR',
        message: '服务器配置错误'
      });
    }

    const appToken = `${appId}|${appSecret}`;

    // 1) 校验 accessToken 属于本 App，且 userID 匹配
    console.log('🔍 验证 Facebook access token...');
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`;
    const debugResponse = await fetch(debugUrl);
    const dbg = await debugResponse.json();

    if (!dbg?.data?.is_valid) {
      console.warn('❌ Facebook token 验证失败: token 无效');
      return res.status(401).json({ 
        error: 'INVALID_TOKEN',
        message: 'Facebook token 验证失败'
      });
    }

    if (dbg.data.app_id !== appId) {
      console.warn(`❌ Facebook token App ID 不匹配: ${dbg.data.app_id} !== ${appId}`);
      return res.status(401).json({ 
        error: 'INVALID_TOKEN',
        message: 'Token App ID 不匹配'
      });
    }

    if (String(dbg.data.user_id) !== String(userID)) {
      console.warn(`❌ Facebook token User ID 不匹配: ${dbg.data.user_id} !== ${userID}`);
      return res.status(401).json({ 
        error: 'INVALID_TOKEN',
        message: 'Token User ID 不匹配'
      });
    }

    console.log('✅ Facebook token 验证成功');

    // 2) 拉最小资料（public_profile）
    console.log('📥 获取 Facebook 用户资料...');
    const meUrl = `https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${accessToken}`;
    const meResponse = await fetch(meUrl);
    const me = await meResponse.json();

    if (!me.id) {
      console.error('❌ 无法获取 Facebook 用户资料:', me);
      return res.status(500).json({ 
        error: 'GRAPH_API_ERROR',
        message: '无法获取用户资料'
      });
    }

    console.log(`✅ 获取到 Facebook 用户资料: ${me.name} (${me.id})`);

    // 3) 绑定/创建站内用户
    const user = await upsertUserWithFacebook(me);

    // 4) 发放站内会话（30 天）
    const tokenPayload = {
      id: user.id,
      facebook_user_id: user.facebook_user_id,
      nickname: user.nickname,
      role: 'user'
    };
    const token = generateToken(tokenPayload);

    console.log(`🍪 设置会话 Cookie: ${COOKIE_NAME}`);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 3600 * 1000 // 30天
    });

    console.log(`✅ Facebook 登录成功: 用户 ${user.id} (${user.nickname})`);
    return res.json({ ok: true });

  } catch (error) {
    console.error('❌ Facebook callback 错误:', error);
    return res.status(500).json({ 
      error: 'SERVER_ERROR',
      message: error.message || '服务器内部错误'
    });
  }
});

// 健康检查端点
router.get('/health', (req, res) => {
  const fbLoginEnabled = process.env.FB_LOGIN_ENABLED === 'true';
  const hasAppId = !!process.env.FB_APP_ID;
  const hasAppSecret = !!process.env.FB_APP_SECRET;
  const hasJwtSecret = !!JWT_SECRET;

  res.json({
    enabled: fbLoginEnabled,
    configured: hasAppId && hasAppSecret && hasJwtSecret,
    appId: hasAppId ? '✓' : '✗',
    appSecret: hasAppSecret ? '✓' : '✗',
    jwtSecret: hasJwtSecret ? '✓' : '✗'
  });
});

module.exports = router;
