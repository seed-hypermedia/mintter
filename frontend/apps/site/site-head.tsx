import {Container, H1, SiteTitle, styled, XStack} from '@mintter/ui'
import Head from 'next/head'
import {HDSiteInfo} from 'server/json-hd'
import {NextLink} from './next-link'

const SITE_NAME = process.env.GW_SITE_NAME || 'Mintter Site'

const SiteHeading = styled(H1, {
  letterSpacing: 'auto',
  color: '$color',
  textDecorationLine: 'none',
  cursor: 'pointer',
  fontSize: '$9',
})

const PageHeading = styled(H1, {
  letterSpacing: 'auto',
  color: '$gray10',
  fontWeight: 'normal',
  fontSize: '$9',
})

export function SiteHead({
  siteInfo,
  title,
  titleHref,
}: {
  siteInfo: HDSiteInfo | null | undefined
  title?: string
  titleHref?: string
}) {
  let titleContent = title ? <PageHeading>{title}</PageHeading> : null
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
  const siteTitle = siteInfo?.title || SITE_NAME
  return (
    <XStack marginBottom={40}>
      <XStack
        alignItems="center"
        justifyContent="space-between"
        gap="$3"
        marginVertical="$3"
      >
        <NextLink
          href="/"
          aria-label="home page"
          style={{textDecoration: 'none'}} // for some reason this is needed instead of tamagui style
        >
          <SiteHeading>{siteTitle}</SiteHeading>
        </NextLink>
        {titleContent}
      </XStack>
      <Head>
        <title>{title ? `${title} - ${siteTitle}` : siteTitle} </title>
        {siteInfo?.description && (
          <meta name="description" content={siteInfo?.description} />
        )}
      </Head>
    </XStack>
  )
}
