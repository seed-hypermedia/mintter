import {useAccountIsConnected, useContactsList} from '@app/hooks/contacts'
import {useNavigate} from '@app/utils/navigation'
import Footer from '@components/footer'
import {OnlineIndicator} from '@components/indicator'
import {Account} from '@mintter/shared'
import {PageProps} from './base'
import {
  Container,
  MainWrapper,
  UIAvatar,
  YStack,
  Button,
  ButtonText,
  Text,
  XStack,
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
        <UIAvatar
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

export default function ConnectionsPage(props: PageProps) {
  const contacts = useContactsList()
  const accounts = contacts.data?.accounts || []
  return (
    <>
      <MainWrapper>
        <Container>
          <YStack tag="ul" padding={0} gap="$2">
            {accounts.map((account) => {
              return <ContactItem key={account.id} account={account} />
            })}
          </YStack>
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
