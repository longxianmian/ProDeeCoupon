module.exports = (app) => {
  // 单页：/liff.html
  app.get('/liff.html', (req, res) => {
    const LIFF_ID = '2008123620-3aeDNRR2'; // ← 你的 LIFF_ID（不要改）
    res.type('html').send(`<!doctype html>
<meta charset="utf-8"/>
<title>LIFF Sign-in (Minimal)</title>
<style>
  body{font-family:system-ui,Arial;padding:16px}
  pre{background:#111;color:#0f0;padding:12px;border-radius:8px;white-space:pre-wrap}
  a.btn,button{display:inline-block;margin:6px 0;padding:8px 14px;font-size:16px;border-radius:8px;border:1px solid #444}
</style>
<h3>LIFF Sign-in (Minimal)</h3>
<div id="actions" style="margin-bottom:8px;"></div>
<pre id="out">启动中...</pre>
<script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
<script>
(async () => {
  const log=(...a)=>{ out.textContent += a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ') + '\\n'; };
  const LIFF_ID='${LIFF_ID}';

  // 1) 先尝试初始化（不启用外部浏览器登录）
  try{
    await liff.init({ liffId: LIFF_ID });
    log('✅ liff.init ok',
        '\\n  inClient=', liff.isInClient(),
        '\\n  loggedIn=', liff.isLoggedIn(),
        '\\n  href=', location.href);
  }catch(e){
    log('💥 liff.init error:', e && e.message ? e.message : e);
    return;
  }

  // 2) 若不在 LINE App 内，则提供一键用 LINE 打开（平台原生姿势）
  if(!liff.isInClient()){
    const a=document.createElement('a');
    a.className='btn';
    a.href = 'line://app/' + LIFF_ID;
    a.textContent='👉 用 LINE 打开（官方 Deep Link）';
    actions.appendChild(a);
    log('ℹ️ 检测到不在 LINE App 内。请点击按钮用 LINE 打开该 LIFF。');
    // 不再自动登录，避免外部浏览器死循环
    return;
  }

  // 3) 在 LINE App 内：若未登录→登录；已登录→直接交换
  if(!liff.isLoggedIn()){
    log('→ 触发 liff.login()（在 LINE App 内）');
    return liff.login({ redirectUri: location.href });
  }

  // 4) 已登录：拿 id_token → 调用后端交换
  const id_token = liff.getIDToken();
  log('🔑 id_token exists =', !!id_token);
  if(!id_token){
    log('❌ 没拿到 id_token（请回主界面重试）');
    return;
  }

  const ex = await fetch('/api/auth/line/exchange', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id_token })
  }).then(r=>r.json()).catch(e=>({error:String(e)}));
  log('🔁 exchange =>', ex);

  const me = await fetch('/api/auth/whoami', { credentials:'include' })
    .then(r=>r.json()).catch(e=>({error:String(e)}));
  log('🧾 whoami =>', me);
})();
</script>`);
  });
};
