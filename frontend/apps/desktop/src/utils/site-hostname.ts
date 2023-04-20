export function hostnameStripProtocol(hostname?: string | null) {
  return (hostname || '').replace(/^https?:\/\//, '')
}
