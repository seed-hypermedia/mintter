export function getCIDFromIPFSUrl(url: string | undefined): string | null {
  if (!url) return null
  const regex = /ipfs:\/\/(.+)/
  const match = url.match(regex)
  return match ? match[1] : null
}
