/**
 * LINE OAuth 2.0 + PKCE 登录实现
 * 方案A：无状态 state（签名 + URL 自携带）+ 数据库存储 code_verifier
 * 完全不依赖预会话 Cookie，适配 LINE 浏览器严格环境
 */

const express = require('express');
const router = express.Router();
const qs = require('querystring');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../storage');
const { pkceSessions, users } = require('../../shared/schema');
const { eq, lt } = require('drizzle-orm');
const { b64urlEncode, b64urlDecode } = require('../utils/base64url');

const CHANNEL_ID = process.env.LINE_CHANNEL_ID || '2008123620';
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const REDIRECT_URI = process.env.LINE_REDIRECT_URI || 'https://prodee.replit.app/auth/line/callback';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'prodee_session';

// 调试用：记录最后一次回调的状态
let lastCallbackDiag = {
  ts: null,
  ok: false,
  reason: 'not_called_yet',
  returnTo: null,
  setCookie: { sent: false, name: null }
};

/**
 * 清理过期的 OAuth 会话（定时任务）
 */
async function cleanupExpiredSessions() {
  try {
    const result = await db
      .delete(pkceSessions)
      .where(lt(pkceSessions.expires_at, new Date()))
      .execute();
    
    if (result.rowCount > 0) {
      console.log(`🧹 [CLEANUP] 清理了 ${result.rowCount} 个过期的 OAuth 会话`);
    }
  } catch (error) {
    console.error('❌ [CLEANUP] 清理失败:', error.message);
  }
}

// 每 10 分钟清理一次过期会话
setInterval(cleanupExpiredSessions, 10 * 60 * 1000);

/**
 * 长度安全裁剪工具（防止数据库varchar超长错误）
 */
const safe = (v, n) => (v && v.length > n ? v.slice(0, n) : v);

/**
 * 登录入口：生成 state + PKCE，存入数据库，跳转到 LINE 授权页
 * GET /auth/line/login?returnTo=/some/path
 */
router.get('/auth/line/login', async (req, res) => {
  try {
    const returnTo = req.query.returnTo || '/';
    
    // 1. 生成 state（Base64URL 编码的 JSON）
    const sid = crypto.randomUUID();
    const statePayload = {
      sid: sid,
      ts: Date.now(),
      rp: returnTo
    };
    const state = b64urlEncode(JSON.stringify(statePayload));
    
    // 2. 生成 PKCE 参数
    const codeVerifier = crypto.randomBytes(64).toString('base64url').slice(0, 128); // <= 128 chars
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // 3. 生成 nonce（OpenID Connect 需要）
    const nonce = crypto.randomBytes(16).toString('hex');
    
    console.log('🔐 [LOGIN] 生成参数:', {
      state: state.substring(0, 16) + '...',
      codeVerifier: codeVerifier.substring(0, 16) + '...',
      codeChallenge: codeChallenge.substring(0, 16) + '...',
      nonce: nonce.substring(0, 8) + '...',
      returnTo
    });
    
    // 4. 存储到数据库（原样存储 state，不做任何编码/解码/截断）
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分钟后过期（给用户足够时间）
    
    await db.insert(pkceSessions).values({
      state: state, // ⚠️ 原样存储，不截断
      code_verifier: codeVerifier,
      nonce: nonce,
      return_path: returnTo || '/',
      expires_at: expiresAt,
      created_at: new Date()
    });
    
    console.log('✅ [LOGIN] OAuth 会话已存入数据库，有效期至:', expiresAt.toISOString());
    
    // 5. 构造 LINE 授权 URL（使用 URLSearchParams，避免二次编码）
    const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', CHANNEL_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', 'openid profile');
    authUrl.searchParams.set('state', state); // ⚠️ 原样传递，不二次编码
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('prompt', 'consent');
    
    console.log('🔗 [LOGIN] 跳转到 LINE 授权页:', authUrl.toString().substring(0, 120) + '...');
    
    // 6. 重定向到 LINE（无需设置任何 Cookie）
    res.redirect(authUrl.toString());
    
  } catch (error) {
    console.error('❌ [LOGIN] 错误:', error);
    res.status(500).send('登录失败，请稍后重试');
  }
});

/**
 * OAuth 回调：验证 state → 从数据库取 code_verifier → 换 token → 发会话 Cookie
 * GET /auth/line/callback?code=xxx&state=xxx
 */
router.get('/auth/line/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    // 初始化诊断信息
    lastCallbackDiag = {
      ts: Date.now(),
      ok: false,
      reason: null,
      returnTo: null,
      setCookie: { sent: false, name: COOKIE_NAME }
    };
    
    console.log('📥 [CALLBACK] 收到回调:', {
      hasCode: !!code,
      hasState: !!state,
      error: error || 'none',
      state: state ? state.substring(0, 16) + '...' : 'missing'
    });
    
    // 1. 处理 LINE 返回的错误
    if (error) {
      lastCallbackDiag.reason = `line_error:${error}`;
      console.error('❌ [CALLBACK] LINE 返回错误:', { error, error_description });
      return res.status(400).json({ 
        ok: false, 
        error: 'LINE 授权失败', 
        details: error_description || error 
      });
    }
    
    // 2. 验证必要参数
    if (!code || !state) {
      lastCallbackDiag.reason = 'missing_params';
      console.error('❌ [CALLBACK] 缺少必要参数:', { hasCode: !!code, hasState: !!state });
      return res.status(400).json({ 
        ok: false, 
        error: '缺少授权码或 state 参数',
        hasCode: !!code,
        hasState: !!state
      });
    }
    
    // 3. 验证 state 格式（Base64URL）
    if (typeof state !== 'string' || !/^[A-Za-z0-9\-_]+$/.test(state)) {
      lastCallbackDiag.reason = 'state_format_invalid';
      console.error('❌ [CALLBACK] State 格式无效:', { state: state.substring(0, 16) + '...' });
      return res.status(400).json({ 
        ok: false, 
        error: 'State 验证失败', 
        details: 'Invalid state format (base64url expected)' 
      });
    }
    
    // 4. 从数据库读取 OAuth 会话（用原样 state 查库）
    const sessions = await db
      .select()
      .from(pkceSessions)
      .where(eq(pkceSessions.state, state))
      .limit(1);
    
    if (sessions.length === 0) {
      lastCallbackDiag.reason = 'code_verifier_miss';
      console.error('❌ [CALLBACK] 数据库中未找到对应的 OAuth 会话:', {
        state: state.substring(0, 16) + '...',
        hint: '可能原因：会话过期（超过15分钟）或已使用'
      });
      
      // 友好的错误页面：提示用户重新登录
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>登录已过期</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                   display: flex; align-items: center; justify-content: center; 
                   min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: white; border-radius: 16px; padding: 40px; 
                    max-width: 400px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
            h1 { color: #333; margin: 0 0 16px; font-size: 24px; }
            p { color: #666; line-height: 1.6; margin: 0 0 24px; }
            .btn { background: #06c755; color: white; border: none; 
                   padding: 16px 32px; border-radius: 8px; font-size: 16px; 
                   font-weight: 600; cursor: pointer; text-decoration: none; 
                   display: inline-block; transition: all 0.3s; }
            .btn:hover { background: #05b34b; transform: translateY(-2px); }
            .icon { font-size: 48px; margin-bottom: 16px; }
            .countdown { color: #999; font-size: 14px; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">⏰</div>
            <h1>登录已过期</h1>
            <p>您的登录会话已过期（超过15分钟）。<br>请重新登录以继续领取优惠券。</p>
            <a href="/" class="btn">返回首页重新登录</a>
            <div class="countdown" id="countdown"></div>
          </div>
          <script>
            let seconds = 5;
            const el = document.getElementById('countdown');
            const timer = setInterval(() => {
              el.textContent = seconds + ' 秒后自动返回首页...';
              if (--seconds < 0) {
                clearInterval(timer);
                window.location.href = '/';
              }
            }, 1000);
            el.textContent = '5 秒后自动返回首页...';
          </script>
        </body>
        </html>
      `);
    }
    
    const session = sessions[0];
    
    console.log('✅ [CALLBACK] 从数据库读取到 OAuth 会话:', {
      state: session.state.substring(0, 16) + '...',
      code_verifier: session.code_verifier.substring(0, 16) + '...',
      returnPath: session.return_path
    });
    
    // 5. 解码 state 做结构化校验（不用解码后的值查库）
    let statePayload;
    try {
      statePayload = JSON.parse(b64urlDecode(state));
      if (!statePayload.sid || !statePayload.ts) {
        return res.status(400).json({ 
          ok: false, 
          error: 'State 验证失败', 
          details: 'Decoded state missing fields' 
        });
      }
      // 检查是否过期（15分钟）
      if (Date.now() - Number(statePayload.ts) > 15 * 60 * 1000) {
        await db.delete(pkceSessions).where(eq(pkceSessions.state, state));
        return res.status(400).json({ 
          ok: false, 
          error: 'State 过期', 
          details: 'State expired',
          retryUrl: '/auth/line/login?returnTo=' + encodeURIComponent(statePayload.rp || '/')
        });
      }
    } catch (e) {
      console.error('❌ [CALLBACK] State 解码失败:', e.message);
      await db.delete(pkceSessions).where(eq(pkceSessions.state, state));
      return res.status(400).json({ 
        ok: false, 
        error: 'State 验证失败', 
        details: 'Decoded JSON invalid' 
      });
    }
    
    lastCallbackDiag.returnTo = statePayload.rp || session.return_path;
    
    console.log('✅ [CALLBACK] State 解码验证通过:', {
      sid: statePayload.sid.substring(0, 8) + '...',
      returnTo: lastCallbackDiag.returnTo
    });
    
    // 6. 立即删除已使用的会话（防止重放攻击）
    await db.delete(pkceSessions).where(eq(pkceSessions.state, state));
    console.log('🗑️  [CALLBACK] 已删除已使用的 OAuth 会话');
    
    // 7. 用 code + code_verifier 换取 access_token（PKCE）
    console.log('🔄 [CALLBACK] 开始换取 access_token...');
    
    const tokenResp = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: qs.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CHANNEL_ID,
        code_verifier: session.code_verifier // 从数据库读取的 code_verifier
      })
    });
    
    const tokenData = await tokenResp.json();
    
    if (!tokenResp.ok) {
      lastCallbackDiag.reason = 'token_exchange_fail';
      console.error('❌ [CALLBACK] 换取 token 失败:', tokenData);
      return res.status(401).json({ 
        ok: false, 
        error: '换取 token 失败', 
        details: tokenData 
      });
    }
    
    console.log('✅ [CALLBACK] 成功换取 token:', {
      hasAccessToken: !!tokenData.access_token,
      hasIdToken: !!tokenData.id_token
    });
    
    // 8. 验证 id_token 并获取用户信息
    console.log('🔄 [CALLBACK] 验证 id_token...');
    
    const verifyResp = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: qs.stringify({
        id_token: tokenData.id_token,
        client_id: CHANNEL_ID,
        nonce: session.nonce // 验证 nonce
      })
    });
    
    const profile = await verifyResp.json();
    
    if (!verifyResp.ok) {
      lastCallbackDiag.reason = 'id_token_verify_fail';
      console.error('❌ [CALLBACK] id_token 验证失败:', profile);
      return res.status(401).json({ 
        ok: false, 
        error: 'id_token 验证失败', 
        details: profile 
      });
    }
    
    console.log('✅ [CALLBACK] id_token 验证成功，用户信息:', {
      sub: profile.sub,
      name: profile.name,
      picture: profile.picture ? profile.picture.substring(0, 50) + '...' : 'none'
    });
    
    // 9. 查找或创建数据库用户
    const lineUserId = profile.sub;
    let userRecords = await db.select().from(users)
      .where(eq(users.line_id, lineUserId))
      .limit(1);
    
    let user = userRecords[0];
    
    if (!user) {
      console.log('👤 [CALLBACK] 创建新用户:', lineUserId);
      const newUserData = {
        line_id: lineUserId,
        nickname: profile.name || 'LINE用户',
        avatar: profile.picture || '',
        is_following: false,
        language: 'th-th'
      };
      
      const newUsers = await db.insert(users)
        .values(newUserData)
        .returning();
      user = newUsers[0];
      console.log('✅ [CALLBACK] 用户创建成功, ID:', user.id);
    } else {
      console.log('📝 [CALLBACK] 用户已存在, ID:', user.id);
    }
    
    // 10. 签发最终会话 Cookie
    const siteJwt = jwt.sign({
      id: user.id,
      lineUserId: user.line_id,
      name: user.nickname,
      picture: user.avatar,
      role: 'user'
    }, JWT_SECRET, { expiresIn: '30d' });
    
    // 关键：使用setHeader方式设置Cookie，确保LINE WebView兼容性
    // SameSite=None; Secure；不设置 domain
    res.setHeader('Set-Cookie', 
      `${COOKIE_NAME}=${siteJwt}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`
    );
    
    // 标记 Cookie 已设置
    lastCallbackDiag.setCookie.sent = true;
    lastCallbackDiag.ok = true;
    lastCallbackDiag.reason = 'success';
    
    console.log('🍪 [CALLBACK] 已设置最终会话 Cookie:', {
      name: COOKIE_NAME,
      expiresIn: '30天'
    });
    
    // 11. 使用 303 重定向到用户原来想去的页面（比 302 更稳定）
    const finalReturnPath = lastCallbackDiag.returnTo || '/';
    
    // ⚠️ 关键：添加 ?login=ok 参数，让前端识别这是登录成功回调
    const returnUrl = new URL(finalReturnPath, `https://${req.headers.host}`);
    returnUrl.searchParams.set('login', 'ok');
    
    console.log('✅ [CALLBACK] 登录成功，303 重定向到:', returnUrl.pathname + returnUrl.search);
    
    res.redirect(303, returnUrl.pathname + returnUrl.search);
    
  } catch (error) {
    lastCallbackDiag.reason = `exception:${error.message}`;
    console.error('❌ [CALLBACK] 发生异常:', error);
    res.status(500).json({ 
      ok: false, 
      error: '服务器错误', 
      details: error.message 
    });
  }
});

/**
 * 退出登录：清除会话 Cookie
 * POST /auth/logout
 */
router.post('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  console.log('👋 [LOGOUT] 用户已退出登录');
  res.json({ ok: true });
});

/**
 * 退出登录（GET 版本，方便浏览器直接访问）
 * GET /auth/logout
 */
router.get('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  console.log('👋 [LOGOUT] 用户已退出登录');
  res.send('已退出登录。<a href="/">返回首页</a>');
});

/**
 * 中间件：验证会话 Cookie
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  
  if (!token) {
    return res.status(401).json({ ok: false, error: 'NO_SESSION' });
  }
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    console.error('❌ [AUTH] JWT 验证失败:', error.message);
    return res.status(401).json({ ok: false, error: 'INVALID_SESSION' });
  }
}

/**
 * 获取当前用户信息（注意：这个路由已经被移到了 /routes/auth.js）
 * 这里注释掉，避免与 server/index.js 的路由冲突
 */
// router.get('/api/me', requireAuth, (req, res) => {
//   res.json({ ok: true, user: req.user });
// });

/**
 * LINE 环境专用：LIFF ID Token 换取会话 Cookie（无重定向）
 * 解决 LINE WebView 重定向丢 Cookie 的问题
 * POST /api/auth/line/liff/exchange
 * Body: { idToken: "..." }
 */
router.post('/api/auth/line/liff/exchange', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success:false, error:'MISSING_ID_TOKEN' });

    console.log('🔄 [LIFF Exchange] 开始验证ID Token...');

    // 1) 去 LINE 官方 verify
    const verify = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: CHANNEL_ID
      })
    }).then(r => r.json());

    if (!verify || !verify.sub) {
      console.error('❌ [LIFF Exchange] ID Token验证失败:', verify);
      return res.status(401).json({ success:false, error:'VERIFY_FAIL', detail: verify });
    }

    console.log('✅ [LIFF Exchange] ID Token验证成功:', {
      lineUserId: verify.sub,
      name: verify.name,
      picture: verify.picture
    });

    // 2) 查找或创建用户
    const lineUserId = verify.sub;
    let userRecords = await db.select().from(users)
      .where(eq(users.line_id, lineUserId))
      .limit(1);
    
    let user = userRecords[0];
    
    if (!user) {
      console.log('👤 [LIFF Exchange] 创建新用户:', lineUserId);
      const newUserData = {
        line_id: lineUserId,
        nickname: verify.name || 'LINE用户',
        avatar: verify.picture || '',
        is_following: false,
        language: 'th-th'
      };
      
      const newUsers = await db.insert(users)
        .values(newUserData)
        .returning();
      user = newUsers[0];
      console.log('✅ [LIFF Exchange] 用户创建成功, ID:', user.id);
    } else {
      console.log('📝 [LIFF Exchange] 用户已存在, ID:', user.id);
      
      // 同步最新的LINE用户信息（昵称、头像）
      const updateData = {};
      if (verify.name && verify.name !== user.nickname) {
        updateData.nickname = verify.name;
      }
      if (verify.picture && verify.picture !== user.avatar) {
        updateData.avatar = verify.picture;
      }
      
      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date();
        await db.update(users)
          .set(updateData)
          .where(eq(users.id, user.id));
        
        user.nickname = updateData.nickname || user.nickname;
        user.avatar = updateData.avatar || user.avatar;
        
        console.log('✅ [LIFF Exchange] 用户信息已更新:', updateData);
      }
    }

    // 3) 生成JWT会话Token
    const sessionToken = jwt.sign({
      id: user.id,
      lineUserId: user.line_id,
      name: user.nickname,
      picture: user.avatar,
      role: 'user'
    }, JWT_SECRET, { expiresIn: '30d' });

    // 4) 设置Cookie（使用COOKIE_NAME变量，不要硬编码）
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`);

    console.log('✅ [LIFF Exchange] 会话创建成功:', {
      userId: user.id,
      cookieName: COOKIE_NAME
    });

    return res.json({ success:true, userId: user.id, lineUserId: user.line_id });
  } catch (e) {
    console.error('❌ [LIFF Exchange] 服务器错误:', e);
    return res.status(500).json({ success:false, error:'SERVER_ERROR' });
  }
});

/**
 * 调试端点：查看最后一次回调的状态
 * GET /__diag/last-callback
 */
router.get('/__diag/last-callback', (req, res) => {
  res.json(lastCallbackDiag);
});

/**
 * 调试端点：查看当前登录状态
 * GET /__diag/whoami
 */
router.get('/__diag/whoami', (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  
  if (!token) {
    return res.json({
      loggedIn: false,
      cookieName: COOKIE_NAME,
      hasCookie: false
    });
  }
  
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({
      loggedIn: true,
      user: {
        lineUserId: user.lineUserId,
        name: user.name
      }
    });
  } catch (error) {
    res.json({
      loggedIn: false,
      cookieName: COOKIE_NAME,
      hasCookie: true,
      error: 'invalid_token',
      details: error.message
    });
  }
});

module.exports = router;
