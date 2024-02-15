import {Avatar} from '@mintter/app/components/avatar'
import Footer from '@mintter/app/components/footer'
import {OnlineIndicator} from '@mintter/app/components/indicator'
import {
  useAccountIsConnected,
  useAllAccounts,
} from '@mintter/app/models/accounts'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {Account} from '@mintter/shared'
import {
  Button,
  Container,
  Heading,
  HeadingProps,
  Spinner,
  Text,
  View,
  XStack,
  YStack,
} from '@mintter/ui'
import {AccountTrustButton} from '../components/account-trust'
import {MainWrapper} from '../components/main-wrapper'
import {PinAccountButton} from '../components/pin-entity'
import {useMyAccount} from '../models/accounts'
import {getAvatarUrl} from '../utils/account-url'

function PageHeading(props: HeadingProps) {
  return (
    <Heading
      color="$gray10"
      fontSize="$7"
      fontWeight="normal"
      marginTop="$6"
      marginBottom="$4"
      {...props}
    />
  )
}

function ContactItem({account}: {account: Account; isTrusted: boolean}) {
  const navigate = useNavigate()
  const isConnected = useAccountIsConnected(account)
  const alias = account.profile?.alias
  if (!alias) return null // hide contacts without an alias because this is confusing for users
  return (
    <Button
      chromeless
      group="item"
      tag="li"
      bg="$backgroundStrong"
      hoverStyle={{
        backgroundColor: '$backgroundHover',
        borderColor: '$backgroundHover',
      }}
      onPress={() => {
        navigate({key: 'account', accountId: account.id})
      }}
    >
      <XStack alignItems="center" gap="$4" flex={1}>
        <Avatar
          size={24}
          id={account.id}
          label={account.profile?.alias}
          url={getAvatarUrl(account.profile?.avatar)}
        />
        {alias ? (
          <Text fontWeight="700" fontFamily="$body">
            {alias}
          </Text>
        ) : (
          <Text fontFamily="$body" fontWeight="bold" color="muted">
            {account.id.slice(0, 5)}...{account.id.slice(-5)}
          </Text>
        )}
      </XStack>
      <XStack
        alignItems="flex-end"
        gap="$3"
        onPress={(e) => {
          e.stopPropagation()
        }}
      >
        <View opacity={0} $group-item-hover={{opacity: 1}}>
          <PinAccountButton accountId={account.id} />
        </View>
        <AccountTrustButton
          accountId={account.id}
          isTrusted={account.isTrusted}
        />
      </XStack>

      <OnlineIndicator online={isConnected} />
    </Button>
  )
}

function ErrorPage({}: {error: any}) {
  // todo, this!
  return (
    <MainWrapper>
      <Container>
        <Text fontFamily="$body" fontSize="$3">
          Error
        </Text>
      </Container>
    </MainWrapper>
  )
}

export default function ContactsPage() {
  const contacts = useAllAccounts(true)
  const myAccount = useMyAccount()
  const allAccounts = contacts.data?.accounts || []
  const trustedAccounts = allAccounts.filter(
    (account) => account.isTrusted && account.id !== myAccount.data?.id,
  )
  const untrustedAccounts = allAccounts.filter((account) => !account.isTrusted)
  if (contacts.isLoading) {
    return (
      <MainWrapper>
        <Container>
          <Spinner />
        </Container>
      </MainWrapper>
    )
  }
  if (contacts.error) {
    return <ErrorPage error={contacts.error} />
  }
  if (allAccounts.length === 0) {
    return (
      <>
        <MainWrapper>
          <Container>
            <YStack gap="$5" paddingVertical="$8">
              <Text fontFamily="$body" fontSize="$3">
                You have no Contacts yet.
              </Text>
            </YStack>
          </Container>
        </MainWrapper>
        <Footer />
      </>
    )
  }
  return (
    <>
      <MainWrapper>
        <Container>
          {trustedAccounts.length ? (
            <>
              <PageHeading>Trusted Accounts</PageHeading>
              <YStack tag="ul" padding={0} gap="$2">
                {trustedAccounts.map((account) => {
                  return (
                    <ContactItem
                      key={account.id}
                      account={account}
                      isTrusted={true}
                    />
                  )
                })}
              </YStack>
              <PageHeading>Other Accounts</PageHeading>
            </>
          ) : null}
          <YStack tag="ul" padding={0} gap="$2">
            {untrustedAccounts.map((account) => {
              return (
                <ContactItem
                  key={account.id}
                  account={account}
                  isTrusted={false}
                />
              )
            })}
          </YStack>
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
