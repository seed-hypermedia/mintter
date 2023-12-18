import {OG_IMAGE_SIZE} from 'server/content-image-meta'

export function OGImageMeta({url}: {url: string}) {
  return (
    <>
      <meta property="og:image" content={url} />
      <meta property="og:image:width" content={`${OG_IMAGE_SIZE.width}`} />
      <meta property="og:image:height" content={`${OG_IMAGE_SIZE.height}`} />
      <meta property="og:image:type" content="image/png" />
    </>
  )
}

export function BasicOGMeta({
  title,
  description,
}: {
  title?: string
  description?: string
}) {
  return (
    <>
      {description ? (
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
