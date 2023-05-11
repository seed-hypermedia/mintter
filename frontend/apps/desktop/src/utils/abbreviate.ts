export function abbreviateCid(cid?: string) {
  if (!cid) return ''
  // a cid is a long string, we want to shorten to 12345...12345
  return `${cid.slice(0, 5)}...${cid.slice(-5)}`
}
