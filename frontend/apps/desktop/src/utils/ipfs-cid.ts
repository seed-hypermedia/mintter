export function getCIDFromIPFSUrl(url: string): string | null {
  const regex = /ipfs:\/\/(.+)/
  const match = url.match(regex)
  return match ? match[1] : null
}
