import {createHmId} from '@mintter/shared'
import {
  Avatar,
  Heading,
  PageSection,
  SizableText,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {cidURL} from 'ipfs'
import Head from 'next/head'
import {HMAccount} from 'server/json-hm'
import {SiteHead} from 'site-head'
import {trpc} from 'trpc'
import Footer from './footer'

function AccountContent({account}: {account: HMAccount | null | undefined}) {
  if (isEmptyObject(account?.profile)) {
    return <AccountNotFound account={account} />
  }

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

function isEmptyObject(obj: unknown) {
  return JSON.stringify(obj) === '{}'
}

export default function AccountPage({accountId}: {accountId: string}) {
  const query = trpc.account.get.useQuery({
    accountId,
  })
  const account = query.data?.account

  return (
    <YStack flex={1}>
      <Head>
        <meta name="hyperdocs-entity-id" content={createHmId('a', accountId)} />
      </Head>
      <SiteHead title={account?.profile?.alias} titleHref={`/a/${accountId}`} />
      <PageSection.Root flex={1}>
        <PageSection.Side />
        <PageSection.Content tag="main" id="main-content" tabIndex={-1}>
          {account && query.isSuccess ? (
            <AccountContent account={account} />
          ) : query.isLoading ? (
            <AccountPlaceholder />
          ) : (
            <AccountNotFound account={account} />
          )}
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
      <Footer />
    </YStack>
  )
}

// TODO: add proper account type
function AccountNotFound({account}: {account?: any}) {
  return (
    <YStack
      paddingVertical="$7"
      paddingHorizontal="$5"
      borderRadius="$5"
      elevation="$1"
      borderColor="$color5"
      borderWidth={1}
      backgroundColor="$color3"
      gap="$3"
    >
      <SizableText size="$6" fontWeight="800" textAlign="center">
        Account not found
      </SizableText>
      <SizableText color="$color9" textAlign="center">
        ({account.id})
      </SizableText>
    </YStack>
  )
}

function AccountPlaceholder() {
  console.log('RENDER PLACEHOLDER')
  return (
    <YStack gap="$6">
      <YStack gap="$3" flex={1} alignItems="center">
        <Avatar circular size={64}>
          <Avatar.Fallback className="placeholder" />
        </Avatar>

        <YStack
          width="100%"
          maxWidth={300}
          height={16}
          className="placeholder"
        />
        <YStack
          width="100%"
          maxWidth={240}
          height={12}
          className="placeholder"
        />
      </YStack>
      <YStack gap="$3" width="100%" alignItems="center">
        <YStack
          width="100%"
          maxWidth={240}
          height={12}
          className="placeholder"
        />
        <YStack
          width="100%"
          maxWidth={270}
          height={12}
          className="placeholder"
        />
        <YStack
          width="100%"
          maxWidth={220}
          height={12}
          className="placeholder"
        />
        <YStack
          width="100%"
          maxWidth={200}
          height={12}
          className="placeholder"
        />
      </YStack>
    </YStack>
  )
}
