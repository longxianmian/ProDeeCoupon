export async function loadScript(src){
  if (document.querySelector(`script[src="${src}"]`)) return
  await new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true
    s.onload = res; s.onerror = () => rej(new Error('LIFF SDK load failed'))
    document.head.appendChild(s)
  })
}

export async function setupLiff(){
  await loadScript('https://static.line-scdn.net/liff/edge/2/sdk.js')
  const liff = window.liff
  if (!liff) throw new Error('LIFF_SDK_NOT_FOUND')
  if (liff._initDone) return liff
  const liffId = import.meta?.env?.VITE_LINE_LIFF_ID || import.meta?.env?.VITE_LIFF_ID
  if (!liffId) throw new Error('NO_LIFF_ID')
  await liff.init({ liffId })
  liff._initDone = true
  return liff
}

export function buildLineDeepLink(redirect){
  const liffId = import.meta?.env?.VITE_LINE_LIFF_ID || import.meta?.env?.VITE_LIFF_ID
  if (!liffId) return null
  const url = new URL('line://app/' + liffId)
  if (redirect) url.searchParams.set('liff.redirectUri', redirect)
  return url.toString()
}