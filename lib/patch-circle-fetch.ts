const APIS = [
  "https://api.circle.com",
  "https://api-staging.circle.com",
  "https://iris-api.circle.com",
  "https://iris-api-sandbox.circle.com",
  "https://gateway-api.circle.com",
  "https://gateway-api-testnet.circle.com",
]

let patched = false

export function patchCircleFetch() {
  if (patched || typeof window === "undefined") return
  patched = true
  const orig = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url
    const match = APIS.find(a => url.startsWith(a))
    if (match) {
      const proxied = `/api/circle-proxy?host=${encodeURIComponent(match)}&path=${encodeURIComponent(url.slice(match.length))}`
      return orig(proxied, {
        ...init,
        headers: { ...(init?.headers ?? {}), "x-circle-target-url": url },
      })
    }
    return orig(input, init)
  }
}
