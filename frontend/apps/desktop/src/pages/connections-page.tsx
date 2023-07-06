import {useAccountIsConnected, useAllAccounts} from '@app/models/accounts'
import {useNavigate} from '@app/utils/navigation'
import {Avatar} from '@components/avatar'
import Footer from '@components/footer'
import {OnlineIndicator} from '@components/indicator'
import {Account} from '@mintter/shared'
import {Button, Container, MainWrapper, Text, XStack, YStack} from '@mintter/ui'

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
          <Text
            fontFamily="$body"
            // @ts-expect-error tamagui upgrade
            fontWeight="bold"
            color="muted"
          >
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
