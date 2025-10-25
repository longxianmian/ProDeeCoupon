let liff = null

async function initLiff() {
  if (liff) return liff
  
  try {
    const { default: liffModule } = await import('@line/liff')
    liff = liffModule
    
    const liffId = import.meta.env.VITE_LINE_LIFF_ID || import.meta.env.VITE_LIFF_ID
    if (!liffId) {
      console.warn('LIFF ID not configured')
      return liff
    }
    
    await liff.init({ liffId })
    return liff
  } catch (error) {
    console.error('LIFF initialization failed:', error)
    return null
  }
}

export async function ensureLogin() {
  await initLiff()
  if (!liff.isLoggedIn()) {
    liff.login()
    return new Promise(() => {})
  }
  return liff.getProfile()
}

export async function isLoggedIn() {
  await initLiff()
  return liff.isLoggedIn()
}