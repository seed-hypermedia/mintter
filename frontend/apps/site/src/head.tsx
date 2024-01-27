import {HMBlockNode, HMPublication} from '@mintter/shared'
import {OG_IMAGE_SIZE} from 'server/content-image-meta'

export function OGImageMeta({url, alt}: {url: string; alt?: string}) {
  return (
    <>
      <meta property="og:image" content={url} />
      <meta property="og:image:width" content={`${OG_IMAGE_SIZE.width}`} />
      <meta property="og:image:height" content={`${OG_IMAGE_SIZE.height}`} />
      <meta property="og:image:type" content="image/png" />
      {alt ? <meta property="og:image:alt" content={alt} /> : null}
    </>
  )
}

export function BasicOGMeta({
  title,
  description,
  userName,
  url,
}: {
  title?: string
  description?: string
  userName?: string
  url?: string
}) {
  return (
    <>
      <meta property="og:type" content="object" />
      {userName ? (
        <meta property="og:author:username" content={userName} />
      ) : null}
      {url ? <meta property="og:url" content={url} /> : null}
      {title ? (
        <>
          <meta property="og:title" content={title} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
        </>
      ) : null}
      {description ? (
        <>
          <meta property="og:description" content={description} />
          <meta name="twitter:description" content={description} />
        </>
      ) : null}
    </>
  )
}

export function SiteOGMeta({siteName}: {siteName?: string}) {
  return (
    <>{siteName ? <meta property="og:site_name" content={siteName} /> : null}</>
  )
}

const DESCRIPTION_MAX_LENGTH = 200
export function getBlockNodeDescription(node: HMBlockNode): string {
  let outputText = node.block.text ? node.block.text.trim() : ''
  let childrenIndex = 0
  while (
    node.children &&
    outputText.length < DESCRIPTION_MAX_LENGTH &&
    childrenIndex + 1 < node.children.length
  ) {
    const child = node.children?.[childrenIndex]
    childrenIndex++
    if (!child) break
    const childDescription = getBlockNodeDescription(child)
    if (childDescription.length > 0) {
      outputText += ' ' + getBlockNodeDescription(child)
    }
  }
  return outputText.trim()
}
export function getPublicationDescription(
  pub: HMPublication | undefined | null,
): string {
  if (!pub) return ''
  const doc = pub.document
  if (!doc) return ''
  let outputText = ''
  const content = doc.children
  if (!content) return ''

  let childrenIndex = 0
  while (
    outputText.length < DESCRIPTION_MAX_LENGTH &&
    childrenIndex + 1 < content.length
  ) {
    const child = content?.[childrenIndex]
    childrenIndex++
    if (!child) break
    const childDescription = getBlockNodeDescription(child)
    if (childDescription.length > 0) {
      outputText += ' ' + getBlockNodeDescription(child)
    }
  }
  return getTruncatedDescription(outputText)
}
export function getTruncatedDescription(description: string): string {
  const trimmed = description.trim()
  let outputText = trimmed
  if (outputText.length > DESCRIPTION_MAX_LENGTH) {
    outputText = outputText.substring(0, DESCRIPTION_MAX_LENGTH - 3) + '...'
  }
  return outputText
}
