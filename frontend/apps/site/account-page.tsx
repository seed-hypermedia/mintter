import {
  Avatar,
  ContainerLarge,
  Header,
  Heading,
  MainContainer,
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
    <XStack>
      <YStack gap="$2">
        {avatar && (
          <Avatar circular size={64}>
            <Avatar.Image src={cidURL(avatar)} />
            <Avatar.Fallback backgroundColor={'#26ab95'} />
          </Avatar>
        )}
        <Heading>{alias}</Heading>
      </YStack>
      <Text>{bio}</Text>
    </XStack>
  )
}

export default function AccountPage({accountId}: {accountId: string}) {
  const publication = trpc.account.get.useQuery({
    accountId,
  })

  const account = publication.data?.account

  return (
    <ContainerLarge tag="main" id="main-content" tabIndex={-1}>
      <SiteHead title={account?.profile?.alias} titleHref={`/a/${accountId}`} />
      <Head>
        <meta name="hyperdocs-entity-id" content={`hd://a/${accountId}`} />
      </Head>
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
      <Footer />
    </ContainerLarge>
  )
}
