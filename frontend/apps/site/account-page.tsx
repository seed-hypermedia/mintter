import {
  Avatar,
  Container,
  Header,
  Heading,
  MainContainer,
  PageSection,
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
            <Avatar.Fallback backgroundColor="$color6" />
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
    <YStack flex={1}>
      <Head>
        <meta name="hyperdocs-entity-id" content={`hd://a/${accountId}`} />
      </Head>
      <SiteHead title={account?.profile?.alias} titleHref={`/a/${accountId}`} />
      <PageSection.Root flex={1}>
        <PageSection.Side />
        <PageSection.Content tag="main" id="main-content" tabIndex={-1}>
          <AccountPlaceholder />
          {/* {account ? (
            <AccountContent account={account} />
          ) : publication.isLoading ? (
            <AccountPlaceholder />
          ) : (
            <Header>Document not found.</Header>
          )} */}
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
      <Footer />
    </YStack>
  )
}

function AccountPlaceholder() {
  return (
    <YStack gap="$6">
      <YStack gap="$3" flex={1} alignItems="center">
        <Avatar circular size={64}>
          <Avatar.Fallback backgroundColor="$color7" />
        </Avatar>

        <YStack
          width="100%"
          maxWidth={300}
          height={16}
          backgroundColor="$color7"
        />
        <YStack
          width="100%"
          maxWidth={240}
          height={12}
          backgroundColor="$color6"
        />
      </YStack>
      <YStack gap="$3" width="100%" alignItems="center">
        <YStack
          width="100%"
          maxWidth={240}
          height={12}
          backgroundColor="$color7"
        />
        <YStack
          width="100%"
          maxWidth={270}
          height={12}
          backgroundColor="$color7"
        />
        <YStack
          width="100%"
          maxWidth={220}
          height={12}
          backgroundColor="$color7"
        />
        <YStack
          width="100%"
          maxWidth={200}
          height={12}
          backgroundColor="$color7"
        />
      </YStack>
    </YStack>
  )
}
