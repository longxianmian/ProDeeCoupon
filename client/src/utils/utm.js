// UTM / clid 解析与持久化（7 天）
const KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','menu_id','slot','fbclid','ttclid']
const TTL = 7 * 24 * 60 * 60 * 1000

export function readUtm(){
  try{
    const raw = JSON.parse(localStorage.getItem('utm_ctx')||'{}')
    if (!raw.expires || Date.now() < raw.expires) return raw.data || {}
  }catch{}
  return {}
}

export function persistUtmFromUrl(){
  const url = new URL(window.location.href)
  const data = readUtm()
  let changed = false
  for (const k of KEYS){
    const v = url.searchParams.get(k)
    if (v!=null){ data[k]=v; changed = true }
  }
  if (changed){ localStorage.setItem('utm_ctx', JSON.stringify({ data, expires: Date.now()+TTL })) }
  return data
}