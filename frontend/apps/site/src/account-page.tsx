import {createHmId} from '@mintter/shared'
import {HMAccount} from '@mintter/shared/src/json-hm'
import {Avatar, Card, H2, Paragraph, XStack, YStack} from '@mintter/ui'
import Head from 'next/head'
import {useRouter} from 'next/router'
import {cidURL} from 'src/ipfs'
import {OpenInAppLink} from 'src/metadata'
import {SiteHead} from 'src/site-head'
import {trpc} from 'src/trpc'
import {ErrorPage} from './error-page'
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
  if (!account.data?.account) {
    return (
      <ErrorPage title="Account not found" description={`(${accountId})`} />
    )
  }
  return (
    <>
      <Head>
        {accountId && (
          <>
            <meta
              name="hypermedia-entity-id"
              content={createHmId('a', accountId!)}
            />
            <meta name="hypermedia-url" content={createHmId('a', accountId!)} />
          </>
        )}
      </Head>
      <MainSiteLayout
        rightSide={<OpenInAppLink url={createHmId('a', accountId)} />}
        head={<SiteHead pageTitle="Account Profile" />}
      >
        {account.data?.account ? (
          <AccountContent account={account.data.account} />
        ) : null}
      </MainSiteLayout>
    </>
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
