function detectChannel(input) {
  const v = (s) => (s || '').toLowerCase();
  const src = v(input.utm_source);
  const ua = v(input.ua);
  let host = '';
  
  try { 
    host = new URL(input.referrer || '').hostname.replace(/^www\./, '').toLowerCase(); 
  } catch {}

  if (input.is_line || ua.includes(' line/')) return 'line';
  if (host.endsWith('tiktok.com') || src.includes('tiktok') || input.query?.msToken || input.query?.tt_webid) return 'tiktok';
  if (host.endsWith('facebook.com') || src.includes('facebook') || src === 'fb' || input.query?.fbclid) return 'facebook';
  if (host.endsWith('instagram.com') || src.includes('instagram') || src === 'ig' || input.query?.igshid) return 'instagram';

  if (!input.referrer && !src) return 'direct';
  return src || 'other';
}

module.exports = { detectChannel };