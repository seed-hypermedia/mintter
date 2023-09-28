import {createHmId} from '@mintter/shared'
import {
  Avatar,
  Card,
  H2,
  PageSection,
  Paragraph,
  SizableText,
  XStack,
  YStack,
} from '@mintter/ui'
import {cidURL} from 'ipfs'
import Head from 'next/head'
import {HMAccount, HMGroup} from 'server/json-hm'
import {SiteHead} from 'site-head'
import Footer from './footer'

function AccountContent({account}: {account: HMAccount | null | undefined}) {
  if (isEmptyObject(account?.profile)) {
    return <AccountNotFound account={account} />
  }

  // return (
  //   <XStack alignItems="center" gap="$3">
  //     {avatar && (
  //       <Avatar circular size={64}>
  //         <Avatar.Image src={cidURL(avatar)} />
  //         <Avatar.Fallback backgroundColor="$color6" />
  //       </Avatar>
  //     )}
  //     <SizableText>{bio}</SizableText>
  //   </XStack>
  // )
  return (
    <XStack>
      <Card
        elevate
        size="$4"
        bordered
        animation="bouncy"
        flex={1}
        height={300}
        // scale={0.9}
        // hoverStyle={{scale: 0.925}}
        // pressStyle={{scale: 0.875}}
      >
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
        <Card.Footer padded>
          {/* <XStack flex={1} />
        <Button borderRadius="$10">Purchase</Button> */}
        </Card.Footer>
        {/* <Card.Background>
        <Image
          alt="Avatar image"
          resizeMode="contain"
          alignSelf="center"
          source={{
            // width: 300,
            // height: 300,
            // uri: account?.profile?.avatar,
            uri: 'https://placehold.co/600x400',
          }}
        />
      </Card.Background> */}
      </Card>
    </XStack>
  )
}

function isEmptyObject(obj: unknown) {
  return JSON.stringify(obj) === '{}'
}

export default function AccountPage({
  account,
  group,
}: {
  account: HMAccount
  group: HMGroup
}) {
  return (
    <>
      <Head>
        {account.id && (
          <meta
            name="hyperdocs-entity-id"
            content={createHmId('a', account.id!)}
          />
        )}
      </Head>
      <SiteHead
        siteTitle={group.title}
        pageTitle="Account Profile"
        siteSubheading={group.description}
      />
      <PageSection.Root flex={1}>
        <PageSection.Side />
        <PageSection.Content tag="main" id="main-content" tabIndex={-1}>
          {account ? (
            <AccountContent account={account} />
          ) : (
            <AccountNotFound account={account} />
          )}
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
      <Footer />
    </>
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

export function AccountPlaceholder() {
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
