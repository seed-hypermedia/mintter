import {useAccountIsConnected, useAllAccounts} from '@app/models/accounts'
import {useNavigate} from '@app/utils/navigation'
import {Avatar} from '@app/components/avatar'
import Footer from '@app/components/footer'
import {OnlineIndicator} from '@app/components/indicator'
import {Account} from '@mintter/shared'
import {
  Button,
  Container,
  MainWrapper,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'

function ContactItem({account}: {account: Account}) {
  const navigate = useNavigate()
  const isConnected = useAccountIsConnected(account)
  const alias = account.profile?.alias
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
          size="$2"
          accountId={account.id}
          alias={account.profile?.alias || ''}
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
      <OnlineIndicator online={isConnected} />
    </Button>
  )
}

export default function ConnectionsPage() {
  const contacts = useAllAccounts()
  const accounts = contacts.data?.accounts || []
  let content = contacts.isLoading ? (
    <Spinner />
  ) : accounts.length > 0 ? (
    accounts.map((account) => {
      return <ContactItem key={account.id} account={account} />
    })
  ) : (
    <YStack gap="$5" paddingVertical="$8">
      <Text fontFamily="$body" fontSize="$3">
        You have no Connections yet.
      </Text>
    </YStack>
  )
  return (
    <>
      <MainWrapper>
        <Container>
          <YStack tag="ul" padding={0} gap="$2">
            {content}
          </YStack>
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
