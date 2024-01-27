import {PageSection, SizableText, XStack} from '@mintter/ui'
import Head from 'next/head'
import {trpc} from 'src/trpc'
import {SiteOGMeta} from './head'
import {NextLink} from './next-link'

export function SiteHead({pageTitle}: {pageTitle?: string}) {
  const siteInfo = trpc.siteInfo.get.useQuery()
  const groupId = siteInfo.data?.groupId
  const siteGroup = trpc.group.get.useQuery({groupId, version: ''})
  const siteTitle = siteGroup.data?.group
    ? siteGroup.data.group.title
    : 'Hypermedia Site (coming soon)'
  return (
    <PageSection.Root
    // this prevents the head to be stretched as the other content in the page.
    >
      <Head>
        <title>{pageTitle}</title>
        {siteTitle && <SiteOGMeta siteName={siteTitle} />}
      </Head>
      <PageSection.Side />
      <PageSection.Content>
        <XStack
          paddingHorizontal="$3"
          $gtMd={{paddingHorizontal: '$5'}}
          // $gtLg={{paddingHorizontal: '$4'}}
          gap="$2"
          alignItems="baseline"
          marginTop="$5"
        >
          <XStack
            borderRadius="$2"
            hoverStyle={{backgroundColor: '$color6'}}
            alignItems="center"
            paddingHorizontal="$2"
            // $gtMd={{paddingHorizontal: '$3'}}
            // $gtLg={{paddingHorizontal: '$'}}
            paddingVertical="$2"
          >
            <NextLink
              href="/"
              aria-label="home page"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }} // for some reason this is needed instead of tamagui style
            >
              <SizableText fontWeight="$10" size="$6">
                {siteTitle}
              </SizableText>
            </NextLink>
          </XStack>
        </XStack>
      </PageSection.Content>
      <PageSection.Side />
    </PageSection.Root>
  )
}
