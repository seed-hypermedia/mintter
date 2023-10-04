import {PageSection, XStack, SizableText} from '@mintter/ui'
import Head from 'next/head'
import {NextLink} from './next-link'
import {trpc} from 'trpc'

export function SiteHead({pageTitle}: {pageTitle?: string}) {
  const siteInfo = trpc.siteInfo.get.useQuery()
  const groupId = siteInfo.data?.groupId
  const siteGroup = trpc.group.get.useQuery({groupId, version: ''})
  const siteTitle = siteGroup.data?.group
    ? siteGroup.data.group.title
    : 'Hypermedia Site'
  const siteSubheading = siteGroup.data?.group
    ? siteGroup.data.group.description
    : ''
  return (
    <PageSection.Root flexGrow={0} paddingTop="$4" $gtMd={{paddingTop: '$6'}}>
      <Head>
        <title>{pageTitle}</title>
        {siteSubheading && <meta name="description" content={siteSubheading} />}
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
        {pageTitle && (
          <XStack
            marginTop="$4"
            $gtSm={{
              marginTop: '$7',
            }}
            paddingLeft="$4"
          >
            <SizableText
              tag="h1"
              size="$9"
              letterSpacing={0}
              fontWeight="600"
              flexDirection="column"
              display="flex"
            >
              {pageTitle}
            </SizableText>
          </XStack>
        )}
      </PageSection.Content>
      <PageSection.Side />
    </PageSection.Root>
  )
}
