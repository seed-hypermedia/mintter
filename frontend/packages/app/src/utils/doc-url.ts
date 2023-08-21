import {Publication, WebPublicationRecord} from '@mintter/shared'

const publicWebHost = 'https://mintter.com'

export function getDocUrl(
  pub: Publication | undefined,
  webPub?: WebPublicationRecord,
): string | null {
  const id = pub?.document?.id
  if (!id) {
    return null
  }
  const publishedWebHost = pub?.document
    ? pub.document.webUrl || publicWebHost
    : null
  let path = `/d/${id}`
  if (webPub?.path === '/') {
    path = '/'
  } else if (webPub?.path) {
    path = `/${webPub.path}`
  }
  let docUrl = `${publishedWebHost}${path}?v=${pub.version}`

  return docUrl
}

export function getPublicDocUrl(docId: string, version?: string | undefined) {
  let webUrl = `${publicWebHost}/d/${docId}`
  if (version) return `${webUrl}?v=${version}`
  return webUrl
}

export function extractEntityId(id: string): [string, string] | null {
  // input is like hd://x/abcd. output is ['x', 'abcd']
  const m = id.match(/^hd:\/\/([^/]+)\/(.+)$/)
  if (!m) return null
  return [m[1], m[2]]
}

export function getPublicEntityUrl(
  groupId: string,
  version?: string | undefined,
) {
  const extractedId = extractEntityId(groupId)
  if (!extractedId) return null
  let webUrl = `${publicWebHost}/${extractedId?.[0]}/${extractedId?.[1]}`
  if (version) return `${webUrl}?v=${version}`
  return webUrl
}
