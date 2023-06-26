import {Publication, WebPublicationRecord} from '@mintter/shared'

export function getDocUrl(
  pub: Publication | undefined,
  webPub?: WebPublicationRecord,
): string | null {
  const id = pub?.document?.id
  if (!id) {
    return null
  }
  const publishedWebHost = pub?.document
    ? pub.document.webUrl || 'https://mintter.com'
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
