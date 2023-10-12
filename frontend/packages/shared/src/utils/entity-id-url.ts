export const HYPERMEDIA_PUBLIC_WEB_GATEWAY = 'https://hyper.media'

export const HYPERMEDIA_SCHEME = 'hm'
export const HYPERMEDIA_ENTITY_TYPES = {
  a: 'Account',
  d: 'Document',
  g: 'Group',
} as const

export function createPublicWebHmUrl(
  type: keyof typeof HYPERMEDIA_ENTITY_TYPES,
  eid: string,
  {
    version,
    blockRef,
    hostname,
  }: {
    version?: string | null | undefined
    blockRef?: string | null | undefined
    hostname?: string | null | undefined
  } = {},
) {
  const webPath = `/${type}/${eid}`
  let urlHost =
    hostname === null
      ? ''
      : hostname === undefined
      ? HYPERMEDIA_PUBLIC_WEB_GATEWAY
      : hostname
  let webUrl = `${urlHost}${webPath}`
  if (version) webUrl += `?v=${version}`
  if (blockRef) webUrl += `#${blockRef}`
  return webUrl
}

export function groupDocUrl(
  groupEid: string,
  version: string | null | undefined,
  pathName: string,
  hostname: null | string = null,
) {
  const type = 'g'
  const webPath = `/${type}/${groupEid}`
  let urlHost =
    hostname === null
      ? ''
      : hostname === undefined
      ? HYPERMEDIA_PUBLIC_WEB_GATEWAY
      : hostname
  let webUrl = `${urlHost}${webPath}`
  if (pathName && pathName !== '/') webUrl += `/${pathName}`
  if (version) webUrl += `?v=${version}`
  return webUrl
}

export function createHmId(
  type: keyof typeof HYPERMEDIA_ENTITY_TYPES,
  id: string,
  opts?: {version?: string | null; blockRef?: string | null; id?: string},
) {
  let outputUrl = `${HYPERMEDIA_SCHEME}://${type}/${id}`
  if (opts?.version) outputUrl += `?v=${opts.version}`
  if (opts?.blockRef) outputUrl += `#${opts.blockRef}`
  return outputUrl
}

type ParsedURL = {
  scheme: string | null
  path: string[]
  query: Record<string, string>
  fragment: string | null
}

export function parseCustomURL(url: string): ParsedURL | null {
  if (!url) return null
  const [scheme, rest] = url.split('://')
  if (!rest) return null
  const [pathAndQuery, fragment] = rest.split('#')
  const [path, queryString] = pathAndQuery.split('?')

  const query: Record<string, string> = {}
  queryString?.split('&').forEach((param) => {
    const [key, value] = param.split('=')
    query[key] = decodeURIComponent(value)
  })

  return {
    scheme,
    path: path.split('/'),
    query,
    fragment: fragment || null,
  }
}

function inKeys<V extends string>(
  key: string,
  values: Record<V, string>,
): V | null {
  // TODO: change to expect-error instead
  // @ts-ignore
  if (values[key]) return key as V
  return null
}

export type UnpackedHypermediaId = {
  id: string
  type: keyof typeof HYPERMEDIA_ENTITY_TYPES
  eid: string
  version: string | null
  blockRef: string | null
  hostname: string | null
  scheme: string | null
}

export function unpackHmId(hypermediaId: string): UnpackedHypermediaId | null {
  const parsed = parseCustomURL(hypermediaId)
  if (parsed?.scheme === HYPERMEDIA_SCHEME) {
    const type = inKeys(parsed?.path[0], HYPERMEDIA_ENTITY_TYPES)
    const eid = parsed?.path[1]
    const version = parsed?.query.v
    if (!type) return null
    return {
      id: hypermediaId,
      type,
      eid,
      version,
      blockRef: parsed?.fragment || null,
      hostname: null,
      scheme: parsed?.scheme,
    }
  }
  if (parsed?.scheme === 'https' || parsed?.scheme === 'http') {
    const type = inKeys(parsed?.path[1], HYPERMEDIA_ENTITY_TYPES)
    const eid = parsed?.path[2]
    const version = parsed?.query.v
    let hostname = parsed?.path[0]
    if (!type) return null
    return {
      id: hypermediaId,
      type,
      eid,
      version,
      blockRef: parsed?.fragment || null,
      hostname,
      scheme: parsed?.scheme,
    }
  }
  return null
}

export type UnpackedDocId = UnpackedHypermediaId & {docId: string}

export function unpackDocId(inputUrl: string): UnpackedDocId | null {
  const unpackedHm = unpackHmId(inputUrl)
  if (!unpackedHm?.eid) return null
  if (unpackedHm.type !== 'd') {
    throw new Error('URL is expected to be a document ID: ' + inputUrl)
  }
  return {
    id: inputUrl,
    eid: unpackedHm.eid,
    type: 'd',
    docId: createHmId('d', unpackedHm.eid),
    version: unpackedHm.version,
    blockRef: unpackedHm.blockRef,
    hostname: unpackedHm.hostname,
    scheme: unpackedHm.scheme,
  }
}

export function isHypermediaScheme(url?: string) {
  return !!url?.startsWith(`${HYPERMEDIA_SCHEME}://`)
}

export function isPublicGatewayLink(text: string) {
  const matchesGateway = text.indexOf(HYPERMEDIA_PUBLIC_WEB_GATEWAY) === 0
  return !!matchesGateway
}

export function idToUrl(
  hmId: string,
  hostname?: string | null | undefined,
  versionId?: string | null | undefined,
  blockRef?: string | null | undefined,
) {
  const unpacked = unpackHmId(hmId)
  if (!unpacked?.type) return null
  return createPublicWebHmUrl(unpacked.type, unpacked.eid, {
    version: versionId || unpacked.version,
    blockRef: blockRef || unpacked.blockRef,
    hostname,
  })
}

export function normlizeHmId(urlMaybe: string): string | undefined {
  if (isHypermediaScheme(urlMaybe)) return urlMaybe
  if (isPublicGatewayLink(urlMaybe)) {
    const unpacked = unpackHmId(urlMaybe)

    if (unpacked?.eid && unpacked.type) {
      return createHmId(unpacked.type, unpacked.eid, unpacked)
    }
    return undefined
  }
}

export function createHmDocLink(
  documentId: string,
  version?: string | null,
  blockRef?: string | null,
): string {
  let res = documentId
  if (version) res += `?v=${version}`
  if (blockRef) res += `${!blockRef.startsWith('#') ? '#' : ''}${blockRef}`
  return res
}

export function labelOfEntityType(type: keyof typeof HYPERMEDIA_ENTITY_TYPES) {
  return HYPERMEDIA_ENTITY_TYPES[type]
}

export function hmIdWithVersion(
  hmId: string | null | undefined,
  version: string | null | undefined,
  blockRef?: string | null | undefined,
) {
  if (!hmId) return null
  const unpacked = unpackHmId(hmId)
  if (!unpacked) return null
  return createHmId(unpacked.type, unpacked.eid, {
    version,
    blockRef,
  })
}

export function extractBlockRefOfUrl(
  url: string | null | undefined,
): string | null {
  return url?.match(/#(.*)$/)?.[1] || null
}
