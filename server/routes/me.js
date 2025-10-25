// server/routes/me.js
const router = require('express').Router();
const { pickUserId } = require('../utils/safe');

/**
 * GET /api/me
 * 返回当前登录用户信息（无需强制登录）
 * 依赖全局optionalAuth中间件注入req.user
 */
router.get('/', (req, res) => {
  const userId = pickUserId(req, res);
  
  if (!userId || !req.user) {
    return res.status(200).json({ 
      ok: false, 
      error: 'NO_SESSION' 
    });
  }
  
  return res.json({ 
    ok: true, 
    user: { 
      id: userId, 
      line_id: req.user.line_id || req.user.lineUserId,
      name: req.user.name || req.user.nickname, 
      picture: req.user.picture || req.user.avatar,
      role: req.user.role || 'user'
    } 
  });
});

module.exports = router;
