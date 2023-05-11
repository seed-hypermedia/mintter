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
      <Container
        marginVertical="$7"
        marginHorizontal="$0"
        paddingHorizontal="$4"
        flex={1}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <NextLink href="/" aria-label="home page">
            <SiteTitle color="$color" cursor="pointer">
              {title || siteInfo?.title || SITE_NAME}
            </SiteTitle>
          </NextLink>
        </XStack>
      </Container>
      <Head>
        <title>{title || siteInfo?.title || SITE_NAME}</title>
        {siteInfo?.description && (
          <meta name="description" content={siteInfo?.description} />
        )}
      </Head>
    </XStack>
  )
}
