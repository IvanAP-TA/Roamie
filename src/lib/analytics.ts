/**
 * Cloudflare Web Analytics: page loads and Core Web Vitals, counted in aggregate, without cookies or personal data.
 *
 * Only on the production site. Not on pages whose address carries an invite code or a sign-in exchange, and without
 * following in-app navigation (`spa: false`), so those addresses never reach the statistics.
 */
const TOKEN = '197395f475084d7ba445fcda1bd0a63e'
const HOSTS = ['roamie.org', 'www.roamie.org']
const PRIVATE_PATHS = [/^\/join(\/|$)/, /^\/auth\//]

export function startAnalytics() {
  if (!import.meta.env.PROD || !HOSTS.includes(window.location.hostname)) return
  if (PRIVATE_PATHS.some((path) => path.test(window.location.pathname))) return

  const script = document.createElement('script')
  script.type = 'module'
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  script.dataset.cfBeacon = JSON.stringify({ token: TOKEN, spa: false })
  document.body.append(script)
}
