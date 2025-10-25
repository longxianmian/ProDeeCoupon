(async () => {
  try { await fetch('/api/auth/refresh', { method:'POST', credentials:'include' }); } catch(e) {}
  try {
    const me = await fetch('/api/auth/whoami', { credentials:'include' }).then(r=>r.json());
    if (!me.ok) location.href = '/liff.html';
    console.log('user=', me.user);
  } catch (e) {
    location.href = '/liff.html';
  }
})();
