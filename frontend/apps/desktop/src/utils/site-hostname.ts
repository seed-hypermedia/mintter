export function hostnameStripProtocol(hostname: string) {
  return hostname.replace(/^https?:\/\//, '')
}
