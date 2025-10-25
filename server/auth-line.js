const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { dbService } = require('./storage');

const router = express.Router();

const {
  LINE_CHANNEL_ID,
  LINE_CHANNEL_SECRET,
  APP_JWT_SECRET,
  REPLIT_DEV_DOMAIN
} = process.env;

// 智能环境检测：自动识别开发环境或生产环境
function getAppBaseUrl() {
  // 如果明确设置了APP_BASE_URL，优先使用（生产环境或自定义域名）
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }
  
  // 开发环境检测：使用Replit提供的公开开发域名
  if (REPLIT_DEV_DOMAIN) {
    const devUrl = `https://${REPLIT_DEV_DOMAIN}`;
    console.log(`🔧 开发环境检测: ${devUrl}`);
    return devUrl;
  }
  
  // 默认回退到生产环境URL
  return 'https://prodee.replit.app';
}

const APP_BASE_URL = getAppBaseUrl();
const LINE_REDIRECT_URI = `${APP_BASE_URL}/auth/line/callback`;

// 启动时输出环境信息
console.log('🌍 环境配置信息:');
console.log(`   BASE_URL: ${APP_BASE_URL}`);
console.log(`   REDIRECT_URI: ${LINE_REDIRECT_URI}`);

// 生成URL安全的base64
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// 定期清理过期PKCE会话（每10分钟清理一次）
setInterval(async () => {
  try {
    await dbService.cleanExpiredPkceSessions();
    console.log('🧹 已清理过期的PKCE会话');
  } catch (error) {
    console.error('❌ 清理PKCE会话失败:', error);
  }
}, 10 * 60 * 1000); // 每10分钟清理一次

// GET /auth/line/start?return=/<回跳路径>
// 生成 PKCE 与 state/nonce，存入 HttpOnly 短期 Cookie，然后 302 到 LINE authorize
router.get('/start', async (req, res) => {
  try {
    console.log('🚀 [方案A-数据库版] 开始PKCE登录流程（数据库存储）...');
    
    const state = b64url(crypto.randomBytes(24));
    const nonce = b64url(crypto.randomBytes(24));
    const verifier = b64url(crypto.randomBytes(40));

    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const ret = req.query.return && String(req.query.return).startsWith('/') ? String(req.query.return) : '/';

    console.log('📝 生成PKCE参数:', { state: state.substring(0, 10) + '...', nonce: nonce.substring(0, 10) + '...', challenge: challenge.substring(0, 10) + '...' });
    console.log('🔄 登录后将返回:', ret);

    // 存储到数据库（因为LINE浏览器不支持第三方Cookie，生产环境需要持久化存储）
    await dbService.createPkceSession(state, verifier, nonce, ret);

    console.log('💾 PKCE参数已存储到数据库');

    // 构建LINE授权URL
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: LINE_CHANNEL_ID,
      redirect_uri: LINE_REDIRECT_URI,
      scope: 'openid profile',
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `https://access.line.me/oauth2/v2.1/authorize?${authParams}`;
    console.log('🔐 重定向到LINE授权页面:', LINE_REDIRECT_URI);

    return res.redirect(authUrl);
  } catch (error) {
    console.error('❌ PKCE登录启动失败:', error);
    return res.status(500).send('Login initialization failed');
  }
});

// GET /auth/line/callback?code=...&state=...
// 用 code + verifier 换 token → 校验 id_token（含 nonce）→ 签发你站内会话 → 回跳
router.get('/callback', async (req, res) => {
  try {
    console.log('📞 [方案A-数据库版] 收到LINE OAuth回调（数据库验证）');
    
    const { code, state } = req.query;
    
    console.log('🔍 回调参数:', { 
      hasCode: !!code,
      codeLength: code?.length,
      hasState: !!state,
      stateValue: state?.substring(0, 10) + '...'
    });

    // 从数据库中获取PKCE会话
    const session = await dbService.getPkceSession(state);
    
    if (!code || !state || !session) {
      console.error('❌ 参数验证失败:', {
        缺少code: !code,
        缺少state: !state,
        找不到会话: !session
      });
      return res.status(400).send('Invalid state or session expired');
    }

    // 取出verifier和nonce，然后删除会话（一次性使用）
    const { code_verifier: verifier, nonce, return_path: after } = session;
    await dbService.deletePkceSession(state);
    
    console.log('✅ 会话验证通过，已删除临时会话');

    console.log('✅ State验证通过');

    // 1) 用授权码换 token（带上 code_verifier）
    console.log('🔑 开始换取access token...');
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: LINE_REDIRECT_URI,
      client_id: LINE_CHANNEL_ID,
      client_secret: LINE_CHANNEL_SECRET,
      code_verifier: verifier
    });

    const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', tokenParams, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokenData = tokenResponse.data;
    if (!tokenData.id_token) {
      console.error('❌ Token响应缺少id_token:', tokenData);
      return res.status(401).send('LINE token exchange failed');
    }

    console.log('✅ 成功获取id_token');

    // 2) 校验 id_token（包含 nonce）
    console.log('🔐 验证id_token...');
    const verifyParams = new URLSearchParams({
      id_token: tokenData.id_token,
      client_id: LINE_CHANNEL_ID,
      nonce: nonce || ''
    });

    const verifyResponse = await axios.post('https://api.line.me/oauth2/v2.1/verify', verifyParams, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const profile = verifyResponse.data;
    if (verifyResponse.status !== 200) {
      console.error('❌ id_token验证失败:', profile);
      return res.status(401).send('LINE id_token verify failed');
    }

    console.log('✅ id_token验证通过, LINE用户:', profile.name);

    // 3) 在数据库中查找或创建用户
    const lineUserId = profile.sub;
    let existingUsers = await dbService.getUserByLineId(lineUserId);
    let user = existingUsers[0];

    if (!user) {
      console.log('👤 创建新用户:', lineUserId);
      const newUserData = {
        line_id: lineUserId,
        nickname: profile.name || 'LINE用户',
        avatar: profile.picture || '',
        is_following: false,
        language: 'zh-cn'
      };
      const [newUser] = await dbService.createUser(newUserData);
      user = newUser;
    } else {
      console.log('📝 更新现有用户:', lineUserId);
      await dbService.updateUser(user.id, {
        nickname: profile.name || user.nickname,
        avatar: profile.picture || user.avatar,
        updated_at: new Date()
      });
      // 更新本地user对象用于生成token
      user.nickname = profile.name || user.nickname;
      user.avatar = profile.picture || user.avatar;
    }

    // 4) 签发站内会话Cookie（使用JWT_SECRET保持与现有系统一致）
    const sessionPayload = {
      id: user.id,
      line_id: user.line_id,
      nickname: user.nickname,
      role: 'user'
    };
    
    const JWT_SECRET = process.env.JWT_SECRET;
    const sessionToken = jwt.sign(sessionPayload, JWT_SECRET, { expiresIn: '7d' });
    
    console.log('🔑 签发会话Cookie，用户ID:', user.id);

    // 设置会话Cookie（使用sid作为Cookie名，与现有系统一致）
    res.cookie('sid', sessionToken, {
      httpOnly: true,
      sameSite: 'none',  // 允许跨站发送（LINE内置浏览器需要）
      secure: true,      // HTTPS环境必须为true（开发环境也是HTTPS）
      maxAge: 7 * 24 * 3600 * 1000
    });

    // 清理临时cookie
    ['line_state', 'line_nonce', 'line_verifier', 'line_return'].forEach(k => res.clearCookie(k));

    console.log('🍪 清理临时Cookie');

    // 5) LINE浏览器终极解决方案：直接返回HTML设置localStorage
    // ⚠️ LINE浏览器限制总结：
    //   - Cookie被阻止（sameSite=none也无效）
    //   - URL Query参数被清除
    //   - Hash Fragment被清除
    // ✅ 解决方案：返回HTML页面，用JavaScript设置localStorage并跳转
    
    // 生成用户token
    const userToken = jwt.sign(sessionPayload, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    console.log('✅ [方案A] 登录成功 - 直接注入token方案');
    console.log('   → 用户:', profile.name, '(DB ID:', user.id, ')');
    console.log('   → 返回HTML页面设置localStorage');
    
    // 返回HTML页面，直接用JavaScript设置token到localStorage
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>登录成功</title>
  <style>
    body { 
      margin: 0; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      text-align: center;
    }
    .success { color: #06C755; font-size: 48px; margin-bottom: 20px; }
    h2 { margin: 0 0 10px; color: #333; }
    p { margin: 5px 0; color: #666; font-size: 14px; }
    .debug { font-size: 12px; color: #999; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✓</div>
    <h2>登录成功</h2>
    <p id="status">正在设置登录状态...</p>
    <p class="debug" id="debug"></p>
  </div>
  <script>
    const debugEl = document.getElementById('debug');
    const statusEl = document.getElementById('status');
    
    try {
      console.log('🔑 [HTML注入] 开始设置token到localStorage');
      debugEl.textContent = '正在设置Token...';
      
      // 设置token
      localStorage.setItem('user_token', ${JSON.stringify(userToken)});
      console.log('✅ [HTML注入] Token已设置到localStorage');
      
      // 验证token是否真的存储了
      const savedToken = localStorage.getItem('user_token');
      if (savedToken) {
        console.log('✅ [HTML注入] Token验证成功，长度:', savedToken.length);
        statusEl.textContent = '登录成功！正在跳转...';
        debugEl.textContent = 'Token已保存 (' + savedToken.substring(0, 20) + '...)';
        
        // 🚫 不要设置app_version！会导致前端清除localStorage
        
        setTimeout(() => {
          window.location.href = '${after}?_t=' + Date.now();
        }, 800);
      } else {
        throw new Error('Token保存失败，localStorage无法写入');
      }
    } catch (e) {
      console.error('❌ [HTML注入] 设置token失败:', e);
      statusEl.textContent = '登录失败';
      debugEl.textContent = '错误: ' + e.message;
      document.querySelector('.success').textContent = '✗';
      document.querySelector('.success').style.color = '#f44336';
    }
  </script>
</body>
</html>`;
    
    return res.send(html);
  } catch (error) {
    console.error('❌ [方案A] 登录失败:', error.message);
    console.error('错误详情:', error.response?.data || error);
    return res.status(500).send('Auth error: ' + error.message);
  }
});

module.exports = router;
