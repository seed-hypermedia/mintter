import Footer from '@mintter/app/components/footer'
import {
  useAccountIsConnected,
  useAllAccounts,
} from '@mintter/app/models/accounts'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {HMAccount, createHmId, hmId} from '@mintter/shared'
import {
  ArrowUpRight,
  Container,
  List,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {AccountTrustButton} from '../components/account-trust'
import {Avatar} from '../components/avatar'
import {useCopyGatewayReference} from '../components/copy-gateway-reference'
import {FavoriteButton} from '../components/favoriting'
import {OnlineIndicator} from '../components/indicator'
import {ListItem, copyLinkMenuItem} from '../components/list-item'
import {MainWrapper, MainWrapperNoScroll} from '../components/main-wrapper'
import {useMyAccount} from '../models/accounts'
import {useFavorite} from '../models/favorites'
import {useGatewayUrl} from '../models/gateway-settings'
import {getAvatarUrl} from '../utils/account-url'
import {AccountRoute} from '../utils/routes'

export function ContactItem({
  account,
  onCopy,
}: {
  account: HMAccount
  onCopy: () => void
}) {
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  const isConnected = useAccountIsConnected(account)
  const accountUrl = account.id ? createHmId('a', account.id) : undefined
  const favorite = useFavorite(accountUrl)
  const alias = account.profile?.alias
  const gwUrl = useGatewayUrl()
  const openRoute: AccountRoute = {key: 'account', accountId: account.id}
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
        navigate(openRoute)
      }}
      title={alias || account.id.slice(0, 5) + '...' + account.id.slice(-5)}
      accessory={
        <>
          {accountUrl && (
            <XStack
              opacity={favorite.isFavorited ? 1 : 0}
              $group-item-hover={
                favorite.isFavorited ? undefined : {opacity: 1}
              }
            >
              <FavoriteButton url={accountUrl} />
            </XStack>
          )}
          <AccountTrustButton
            accountId={account.id}
            isTrusted={account.isTrusted}
          />
          <OnlineIndicator online={isConnected} />
        </>
      }
      menuItems={() => [
        {
          key: 'spawn',
          label: 'Open in New Window',
          icon: ArrowUpRight,
          onPress: () => {
            spawn(openRoute)
          },
        },
        copyLinkMenuItem(
          onCopy,
          account.profile?.alias
            ? `${account.profile.alias}'s Profile`
            : `Profile`,
        ),
      ]}
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
  const untrustedAccounts = allAccounts.filter(
    (account) => !account.isTrusted && !!account.profile?.alias, // hide contacts without an alias because this is confusing for users
  )
  const [copyDialogContent, onCopy] = useCopyGatewayReference()
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
          fixedItemHeight={52}
          renderItem={({item}) => {
            return (
              <ContactItem
                key={item.id}
                account={item}
                onCopy={() => {
                  onCopy(hmId('a', item.id))
                }}
              />
            )
          }}
          onEndReached={() => {
            contacts.fetchNextPage()
          }}
        />
      </MainWrapperNoScroll>
      {copyDialogContent}
      <Footer />
    </>
  )
}
