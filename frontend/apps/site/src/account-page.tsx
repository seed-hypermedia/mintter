import {createHmId} from '@mintter/shared'
import {HMAccount} from '@mintter/shared/src/json-hm'
import {
  Avatar,
  Card,
  H2,
  Paragraph,
  SizableText,
  XStack,
  YStack,
} from '@mintter/ui'
import Head from 'next/head'
import {useRouter} from 'next/router'
import {cidURL} from 'src/ipfs'
import {OpenInAppLink} from 'src/metadata'
import {SiteHead} from 'src/site-head'
import {trpc} from 'src/trpc'
import {MainSiteLayout} from './site-layout'

function AccountContent({account}: {account: HMAccount | null | undefined}) {
  return (
    <XStack>
      <Card elevate size="$4" bordered animation="fast" flex={1} height={300}>
        <Card.Header padded>
          <H2>{account?.profile?.alias}</H2>
          <Paragraph theme="alt2">{account?.profile?.bio}</Paragraph>
          {account?.profile?.avatar && (
            <YStack paddingVertical="$3">
              <Avatar circular size={80}>
                <Avatar.Image src={cidURL(account?.profile?.avatar)} />
                <Avatar.Fallback backgroundColor="$color6" />
              </Avatar>
            </YStack>
          )}
        </Card.Header>
      </Card>
    </XStack>
  )
}

export default function AccountPage({}: {}) {
  const router = useRouter()
  const accountId = String(router.query.accountId)
  const account = trpc.account.get.useQuery({accountId})
  return (
    <>
      <Head>
        {accountId && (
          <meta
            name="hypermedia-entity-id"
            content={createHmId('a', accountId!)}
          />
        )}
      </Head>
      <MainSiteLayout
        rightSide={<OpenInAppLink url={createHmId('a', accountId)} />}
        head={<SiteHead pageTitle="Account Profile" />}
      >
        {account.data?.account ? (
          <AccountContent account={account.data.account} />
        ) : (
          <AccountNotFound accountId={accountId} />
        )}
      </MainSiteLayout>
    </>
  )
}

function AccountNotFound({accountId}: {accountId?: string}) {
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
        ({accountId})
      </SizableText>
    </YStack>
  )
}

export function AccountPlaceholder() {
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
