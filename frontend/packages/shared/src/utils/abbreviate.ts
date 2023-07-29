export function abbreviateCid(cid?: string) {
  if (!cid) return ''
  if (cid === null) return '(empty)'
  // a cid is a long string, we want to shorten to 12345...12345
  return `${cid.slice(0, 8)}...${cid.slice(-8)}`
}
