import {SiteInfo} from '@mintter/shared'
import {Container, SiteTitle, XStack} from '@mintter/ui'
import Head from 'next/head'
import {NextLink} from './next-link'

const SITE_NAME = process.env.GW_SITE_NAME || 'Mintter Site'

export function SiteHead({
  siteInfo,
  title,
}: {
  siteInfo: SiteInfo | null
  title?: string
}) {
  return (
    <XStack>
      <Head>
        <title>{title || siteInfo?.title || SITE_NAME}</title>
        {siteInfo?.description && (
          <meta name="description" content={siteInfo?.description} />
        )}
      </Head>
      <Container my="$7">
        <XStack>
          <NextLink href="/" aria-label="home page">
            <SiteTitle cur="pointer">{siteInfo?.title}</SiteTitle>
          </NextLink>
        </XStack>
      </Container>
    </XStack>
  )
}
