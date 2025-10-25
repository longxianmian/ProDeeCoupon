export function track(evt, payload={}){
  if (window.gtag) window.gtag('event', evt, payload)
  else if (window.dataLayer) window.dataLayer.push({ event: evt, ...payload })
  else console.log('[track]', evt, payload)
}