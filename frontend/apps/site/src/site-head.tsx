import {PageSection, XStack, SizableText} from '@mintter/ui'
import Head from 'next/head'
import {NextLink} from './next-link'
import {trpc} from 'src/trpc'

export function SiteHead({pageTitle}: {pageTitle?: string}) {
  const siteInfo = trpc.siteInfo.get.useQuery()
  const groupId = siteInfo.data?.groupId
  const siteGroup = trpc.group.get.useQuery({groupId, version: ''})
  const siteTitle = siteGroup.data?.group
    ? siteGroup.data.group.title
    : 'Hypermedia Site (coming soon)'
  return (
    <PageSection.Root
      paddingTop="$4"
      $gtMd={{paddingTop: '$6', paddingBottom: '$6'}}
      // this prevents the head to be stretched as the other content in the page.
      flex="none"
    >
      <Head>
        <title>{pageTitle}</title>
        {siteTitle && <meta property="og:site_name" content={siteTitle} />}
      </Head>
      <PageSection.Side />
      <PageSection.Content>
        <XStack gap="$2" alignItems="baseline" paddingLeft="$4">
          <XStack
            x="$-3"
            borderRadius="$3"
            paddingHorizontal="$3"
            paddingVertical="$1"
            hoverStyle={{backgroundColor: '$color6'}}
            alignItems="center"
            marginLeft="1.5em"
          >
            <NextLink
              href="/"
              aria-label="home page"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }} // for some reason this is needed instead of tamagui style
              prefetch
            >
              <SizableText size="$6">{siteTitle}</SizableText>
            </NextLink>
          </XStack>
        </XStack>
      </PageSection.Content>
      <PageSection.Side />
    </PageSection.Root>
  )
}
