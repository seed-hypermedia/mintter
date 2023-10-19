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
