import {PageSection, H1, styled, XStack, SizableText} from '@mintter/ui'
import Head from 'next/head'
import {trpc} from 'trpc'
import {NextLink} from './next-link'

const SITE_NAME = process.env.GW_SITE_NAME || 'Mintter Site'

export function SiteHead({
  title,
  titleHref,
}: {
  title?: string
  titleHref?: string
}) {
  const siteInfo = trpc.siteInfo.get.useQuery()
  let titleContent = title ? <H1>{title}</H1> : null
  if (titleHref && titleContent) {
    titleContent = (
      <NextLink
        style={{textDecoration: 'none'}} // for some reason this is needed instead of tamagui style
        href={titleHref}
      >
        {titleContent}
      </NextLink>
    )
  }
  const {title: siteInfoTitle, description} = siteInfo?.data || {}
  const siteTitle = siteInfoTitle || SITE_NAME
  const siteDescription = description || ''
  return (
    <PageSection.Root flexGrow={0} isHeader={true}>
      <Head>
        <title>{title ? `${title} - ${siteTitle}` : siteTitle}</title>
        {description && <meta name="description" content={description} />}
      </Head>
      <PageSection.Side />
      <PageSection.Content>
        <NextLink
          href="/"
          aria-label="home page"
          style={{textDecoration: 'none'}} // for some reason this is needed instead of tamagui style
        >
          <SizableText
            tag="h1"
            size="$9"
            letterSpacing={0}
            fontWeight="600"
            flexDirection="column"
            display="flex"
          >
            <span>{siteTitle}</span>
            {siteDescription ? (
              <SizableText tag="small" color="$color8">
                {siteDescription}
              </SizableText>
            ) : null}
          </SizableText>
        </NextLink>
      </PageSection.Content>
      <PageSection.Side />
    </PageSection.Root>
  )
}
