module.exports = (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const name = process.env.COOKIE_NAME || 'sid';
    const token = (req.cookies && req.cookies[name]) || '';
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, line_id, nickname, avatar, exp, iat ... }
    next();
  } catch (e) {
    res.status(401).json({ ok:false, code:401, msg:'unauthorized' });
  }
};
