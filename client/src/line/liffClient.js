import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID || window.__LIFF_ID__;

export function isInLineApp(){
  return /Line\//i.test(navigator.userAgent || '');
}

export async function ensureLiffReady(){
  if (!isInLineApp()) return false;
  if (!LIFF_ID) throw new Error('Missing VITE_LINE_LIFF_ID');
  await liff.init({ liffId: LIFF_ID });
  return true;
}

export async function ensureLogin(){
  // 有会话直接通过
  const me = await fetch('/api/me', { credentials:'include' }).then(r=>r.ok && r.json()).catch(()=>null);
  if (me && me.success && me.data) return true;

  if (await ensureLiffReady()){
    if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return false; }
    const idToken = liff.getIDToken();
    const r = await fetch('/api/auth/line/liff/exchange', {
      method:'POST', headers:{ 'Content-Type':'application/json' }, credentials:'include',
      body: JSON.stringify({ idToken })
    });
    const j = await r.json();
    if (j && j.success){ location.reload(); return false; }
    // 降级到 OAuth
    location.href = '/auth/line/login?redirect=' + encodeURIComponent(location.href);
    return false;
  }

  // 非 LINE 环境 → 直接 OAuth
  location.href = '/auth/line/login?redirect=' + encodeURIComponent(location.href);
  return false;
}

/** 扫码（优先用 v2，失败回退 v1） */
export async function scanQr() {
  await ensureLiffReady();
  const anyLiff = liff;
  try {
    if (anyLiff.scanCodeV2) {
      const r = await anyLiff.scanCodeV2();
      return r?.value || null;
    }
    const r = await anyLiff.scanCode(); // 老 API
    return r?.value || null;
  } catch {
    return null;
  }
}

/** 分享文本/模板（需在 Console 开启 shareTargetPicker） */
export async function shareText(text) {
  await ensureLiffReady();
  try {
    const ok = await liff.shareTargetPicker([{ type: 'text', text }]);
    return !!ok;
  } catch {
    return false;
  }
}

/** 
 * 分享富文本消息（Flex Message）
 * @param {Object} options - 分享选项
 * @param {string} options.imageUrl - 图片URL（完整URL）
 * @param {string} options.title - 标题
 * @param {string} options.description - 描述
 * @param {string} options.linkUrl - 详情页链接（完整URL）
 * @param {string} options.buttonText - 按钮文字（默认"查看详情"）
 */
export async function shareFlex({ imageUrl, title, description, linkUrl, buttonText = '查看详情' }) {
  await ensureLiffReady();
  try {
    // Flex Message 格式：包含图片、标题、描述、查看详情按钮
    const flexMessage = {
      type: 'flex',
      altText: title,
      contents: {
        type: 'bubble',
        hero: {
          type: 'image',
          url: imageUrl,
          size: 'full',
          aspectRatio: '16:9',
          aspectMode: 'cover'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: title,
              weight: 'bold',
              size: 'xl',
              wrap: true,
              margin: 'none'
            },
            {
              type: 'text',
              text: description,
              size: 'sm',
              color: '#999999',
              margin: 'md',
              wrap: true
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: buttonText,
                uri: linkUrl
              }
            }
          ],
          flex: 0
        }
      }
    };

    const ok = await liff.shareTargetPicker([flexMessage]);
    return !!ok;
  } catch (err) {
    console.error('分享Flex Message失败:', err);
    return false;
  }
}

/** 打开聊天窗口（给你的官方帐号/群） */
export async function openChatToOfficial(accountId) {
  // accountId 形如 "@youroaid"
  await ensureLiffReady();
  // 使用 LINE URL scheme
  liff.openWindow({ url: `https://line.me/R/ti/p/${encodeURIComponent(accountId)}`, external: true });
}

/** 在 LINE 内打开你自己的某个页面（保持当前 webview） */
export async function openInLine(url) {
  await ensureLiffReady();
  liff.openWindow({ url, external: false });
}

/** （仅在聊天上下文可用）发送消息 */
export async function sendMessageInChat(text) {
  await ensureLiffReady();
  try {
    await liff.sendMessages([{ type: 'text', text }]);
    return true;
  } catch {
    return false;
  }
}
