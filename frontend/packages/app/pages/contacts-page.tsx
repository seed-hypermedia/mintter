import Footer from '@mintter/app/components/footer'
import {
  useAccountIsConnected,
  useAllAccounts,
} from '@mintter/app/models/accounts'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {Account} from '@mintter/shared'
import {
  Container,
  Heading,
  HeadingProps,
  List,
  Spinner,
  Text,
  View,
  YStack,
} from '@mintter/ui'
import {AccountTrustButton} from '../components/account-trust'
import {Avatar} from '../components/avatar'
import {OnlineIndicator} from '../components/indicator'
import {ListItem} from '../components/list-item'
import {MainWrapper, MainWrapperNoScroll} from '../components/main-wrapper'
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
    <ListItem
      icon={
        <Avatar
          size={24}
          id={account.id}
          label={account.profile?.alias}
          url={getAvatarUrl(account.profile?.avatar)}
        />
      }
      onPress={() => {
        navigate({key: 'account', accountId: account.id})
      }}
      title={alias || account.id.slice(0, 5) + '...' + account.id.slice(-5)}
      accessory={
        <>
          <View opacity={0} $group-item-hover={{opacity: 1}}>
            <PinAccountButton accountId={account.id} />
          </View>
          <AccountTrustButton
            accountId={account.id}
            isTrusted={account.isTrusted}
          />
          <OnlineIndicator online={isConnected} />
        </>
      }
    />
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
      <MainWrapperNoScroll>
        <List
          items={[...trustedAccounts, ...untrustedAccounts]}
          renderItem={({item}) => {
            return (
              <ContactItem
                key={item.id}
                account={item}
                isTrusted={item.isTrusted}
              />
            )
          }}
        />
      </MainWrapperNoScroll>
      <Footer />
    </>
  )
}
