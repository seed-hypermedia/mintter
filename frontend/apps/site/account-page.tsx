import {
  ArticleContainer,
  Avatar,
  ContainerLarge,
  Header,
  Heading,
  MainContainer,
  SideContainer,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import Head from 'next/head'
import Footer from './footer'
import {trpc} from 'trpc'
import {HDAccount} from 'server/json-hd'
import {SiteHead} from 'site-head'
import {cidURL} from 'ipfs'

function AccountContent({account}: {account: HDAccount | null | undefined}) {
  const {alias, bio, avatar} = account?.profile || {}
  return (
    <YStack>
      <XStack gap="$2">
        {avatar && (
          <Avatar size={64}>
            <Avatar.Image src={cidURL(avatar)} />
            <Avatar.Fallback />
          </Avatar>
        )}
        <Heading>{alias}</Heading>
      </XStack>
      <Text>{bio}</Text>
    </YStack>
  )
}

function AccountMetadata({account}: {account: HDAccount | null | undefined}) {
  return null
}

export default function AccountPage({accountId}: {accountId: string}) {
  const siteInfo = trpc.siteInfo.get.useQuery()
  const publication = trpc.account.get.useQuery({
    accountId,
  })

  const account = publication.data?.account

  return (
    <ContainerLarge tag="main" id="main-content" tabIndex={-1}>
      <SiteHead
        siteInfo={siteInfo.data}
        title={account?.profile?.alias}
        titleHref={`/a/${accountId}`}
      />
      <Head>
        <meta name="hyperdocs-entity-id" content={`hd://a/${accountId}`} />
      </Head>
      <ArticleContainer flexWrap="wrap">
        <MainContainer flex={3} className="web-publication">
          {account ? (
            <AccountContent account={account} />
          ) : publication.isLoading ? (
            <YStack>
              <Spinner />
            </YStack>
          ) : (
            <Header>Document not found.</Header>
          )}
        </MainContainer>
        <SideContainer flex={1}>
          <AccountMetadata account={account} />
        </SideContainer>
      </ArticleContainer>
      {siteInfo ? null : <Footer />}
    </ContainerLarge>
  )
}
