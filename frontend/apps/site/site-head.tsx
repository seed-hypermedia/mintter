import {ContainerLarge, H1, styled, XStack} from '@mintter/ui'
import Head from 'next/head'
import {trpc} from 'trpc'
import {NextLink} from './next-link'

const SITE_NAME = process.env.GW_SITE_NAME || 'Mintter Site'

const SiteHeading = styled(H1, {
  letterSpacing: 'auto',
  color: '$color',
  textDecorationLine: 'none',
  cursor: 'pointer',
  fontSize: '$8',
})

const PageHeading = styled(H1, {
  letterSpacing: 'auto',
  color: '$gray10',
  fontWeight: 'normal',
  fontSize: '$8',
})

export function SiteHead({
  title,
  titleHref,
}: {
  title?: string
  titleHref?: string
}) {
  const siteInfo = trpc.siteInfo.get.useQuery()
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
  const {title: siteInfoTitle, description} = siteInfo?.data || {}
  const siteTitle = siteInfoTitle || SITE_NAME
  return (
    <ContainerLarge>
      <XStack>
        <XStack
          alignItems="center"
          justifyContent="space-between"
          gap="$3"
          marginVertical="$2"
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
          <title>{title ? `${title} - ${siteTitle}` : siteTitle}</title>
          {description && <meta name="description" content={description} />}
        </Head>
      </XStack>
    </ContainerLarge>
  )
}
