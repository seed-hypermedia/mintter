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
  MainWrapper,
  Spinner,
  Text,
  XStack,
  YStack,
  styled,
} from '@mintter/ui'
import {PlusCircle} from '@tamagui/lucide-icons'
import {useSetTrusted} from '../models/accounts'
import {getAvatarUrl} from '../utils/account-url'

const PageHeading = styled(Heading, {
  color: '$gray10',
  fontSize: '$7',
  fontWeight: 'normal',
})

function ContactItem({
  account,
  isTrusted,
}: {
  account: Account
  isTrusted: boolean
}) {
  const navigate = useNavigate()
  const isConnected = useAccountIsConnected(account)
  const alias = account.profile?.alias
  const setTrusted = useSetTrusted()
  return (
    <Button
      chromeless
      theme="gray"
      tag="li"
      gap="$4"
      onPress={() => {
        navigate({key: 'account', accountId: account.id})
      }}
    >
      <XStack alignItems="center" gap="$4" flex={1}>
        <Avatar
          size={36}
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
      {!isTrusted && (
        <Button
          onPress={(e) => {
            e.stopPropagation()
            setTrusted.mutate({accountId: account.id, isTrusted: true})
          }}
          icon={PlusCircle}
        >
          Trust
        </Button>
      )}
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
  const allAccounts = contacts.data?.accounts || []
  const trustedAccounts = allAccounts.filter((account) => account.isTrusted)
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
              <PageHeading>Trusted Contacts</PageHeading>
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
              <PageHeading marginTop="$4">Other Contacts</PageHeading>
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
