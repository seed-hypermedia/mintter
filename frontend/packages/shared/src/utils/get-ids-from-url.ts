export const HYPERMEDIA_DOCUMENT_PREFIX = 'hm://d/'
export const HYPERMEDIA_ACCOUNT_PREFIX = 'hm://a/'
export const HYPERMEDIA_GROUP_PREFIX = 'hm://g/'
export const HYPERMEDIA_SITES_PATTERN =
  /^https:\/\/(www\.)?([^/]+)\/(d|a|g)\/([^/?#]+)(\?.+)?(#.+)?$/

export function matchesHypermediaPattern(url: string): boolean {
  return HYPERMEDIA_SITES_PATTERN.test(url)

  // Test cases
  // const testCases = [
  //   "https://mintter.com/d/foo",
  //   "https://mintter.com/d/foo?v=bar",
  //   "https://mintter.com/d/foo?v=bar#block",
  //   "https://www.mintter.com/d/foo?v=bar#block",
  //   "https://gabo.es/d/anotherpath",
  //   "https://gabo.es/d/anotherpath?v=versionhere",
  //   "https://gabo.es/d/anotherpath?v=bar#block",
  //   "https://www.hhg.link/g/somegroupid",
  //   "https://juligasa.es/a/accountid"
  // ];
}

export function extractHypermediaWebsiteValues(url: string) {
  const match = url.match(HYPERMEDIA_SITES_PATTERN)

  if (!match) {
    return null
  }

  const [, , hostname, pathType, docId, queryAndFragment] = match
  const [query, fragment] = queryAndFragment ? queryAndFragment.split('#') : []

  const versionMatch = query && query.match(/[?&]v=([^&]+)/)
  const version = versionMatch ? versionMatch[1] : undefined

  return {
    hostname,
    pathType,
    docId,
    version,
    blockId: fragment || undefined,
  }
}

export function getIdsfromUrl(
  entry: string,
): [docId: string | undefined, version?: string, blockId?: string] {
  console.log(`[getIdsfromUrl]: START -> ${entry}`)
  if (matchesHypermediaPattern(entry)) {
    const values = extractHypermediaWebsiteValues(entry)
    if (values) {
      let {docId, version, blockId} = values

      console.log(
        `[getIdsfromUrl]: entry match web sites pattern: ${entry} -> ${JSON.stringify(
          values,
        )}`,
      )
      return [docId, version, blockId]
    }
  }

  if (entry.startsWith(HYPERMEDIA_DOCUMENT_PREFIX)) {
    const [, restUrl] = entry.split(HYPERMEDIA_DOCUMENT_PREFIX)
    if (restUrl.length > 3) {
      const [docId, version, blockId] = restUrl.split('?v=')[0].split('#')
      console.log(`[getIdsfromUrl]: entry match Fully Qualified ID: ${entry}`)
      return [docId, version, blockId]
    } else {
      console.warn(
        `[getIdsfromUrl]: entry match Fully Qualified ID, but does not satisfy the correct length: ${entry}`,
      )
    }
  }

  console.warn(`[getIdsfromUrl]: entry does not match any pattern: ${entry}`)

  return [undefined, undefined, undefined]
}
