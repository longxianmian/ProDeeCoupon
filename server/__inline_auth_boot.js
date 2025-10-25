module.exports = (app) => {
  // 探针：确认模块已加载
  app.get('/api/auth/__ping', (req,res)=>res.json({ ok:true, where:'__inline_auth_boot.js' }));

  // 交换接口：前端把 LIFF 拿到的 id_token 发这里
  app.post('/api/auth/line/exchange', async (req,res)=>{
    try{
      const id_token = req.body && req.body.id_token;
      if(!id_token) return res.status(400).json({ code:400, msg:'missing id_token' });

      const axios = require('axios');
      const jwt   = require('jsonwebtoken');
      const COOKIE_NAME = process.env.COOKIE_NAME || 'sid';

      // 向 LINE 验证 id_token（必须配置 LINE_CHANNEL_ID）
      const vr = await axios.post(
        'https://api.line.me/oauth2/v2.1/verify',
        new URLSearchParams({ id_token, client_id: process.env.LINE_CHANNEL_ID }).toString(),
        { headers: { 'content-type': 'application/x-www-form-urlencoded' } }
      );

      const v = vr.data; // { sub, name?, picture? ... }
      if(!v || !v.sub) return res.status(401).json({ code:401, msg:'invalid id_token' });

      // 生成站内会话并写入 Cookie
      const payload = { id:String(v.sub), line_id:v.sub, nickname:v.name||'', avatar:v.picture||'' };
      const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.cookie(COOKIE_NAME, token, {
        httpOnly:true, secure:true, sameSite:'none', path:'/', maxAge: 7*24*3600*1000
      });

      return res.json({ ok:true, user:payload, source:'__inline_auth_boot.js' });
    }catch(err){
      const status = (err.response && err.response.status) || 500;
      const data   = (err.response && err.response.data) || { msg: err.message };
      return res.status(status).json({ code:status, error:data, source:'__inline_auth_boot.js' });
    }
  });
};
