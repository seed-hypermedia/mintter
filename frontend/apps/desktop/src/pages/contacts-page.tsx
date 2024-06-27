import { Avatar } from '@/components/avatar'
import { useCopyGatewayReference } from '@/components/copy-gateway-reference'
import { useDeleteDialog } from '@/components/delete-dialog'
import { FavoriteButton } from '@/components/favoriting'
import Footer from '@/components/footer'
import { OnlineIndicator } from '@/components/indicator'
import { ListItem, copyLinkMenuItem } from '@/components/list-item'
import { MainWrapper, MainWrapperNoScroll } from '@/components/main-wrapper'
import { MenuItemType } from '@/components/options-dropdown'
import {
  useAccountIsConnected,
  useAllAccounts,
  useMyAccount_deprecated,
} from '@/models/accounts'
import { useFavorite } from '@/models/favorites'
import { useGatewayUrl } from '@/models/gateway-settings'
import { getAvatarUrl } from '@/utils/account-url'
import { AccountRoute } from '@/utils/routes'
import { useNavigate } from '@/utils/useNavigate'
import { HMAccount, createHmId, hmId } from '@shm/shared'
import {
  ArrowUpRight,
  Container,
  List,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@shm/ui'
import { Trash } from '@tamagui/lucide-icons'

export function ContactItem({
  account,
  onCopy,
  onDelete,
}: {
  account: HMAccount
  onCopy: () => void
  onDelete?: (input: { id: string; title?: string }) => void
}) {
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  const isConnected = useAccountIsConnected(account)
  const accountUrl = account.id ? createHmId('a', account.id) : undefined
  const favorite = useFavorite(accountUrl)
  const alias = account.profile?.alias
  const gwUrl = useGatewayUrl()
  const accountId = account.id
  if (!accountId) throw new Error('Account ID is required')
  const openRoute: AccountRoute = { key: 'account', accountId }
  const menuItems: (MenuItemType | null)[] = [
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
      account.profile?.alias ? `${account.profile.alias}'s Profile` : `Profile`,
    ),
  ]
  if (onDelete) {
    menuItems.push({
      key: 'delete',
      label: 'Delete Account',
      icon: Trash,
      onPress: () => {
        onDelete({
          id: createHmId('a', accountId),
          title: account.profile?.alias,
        })
      },
    })
  }
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
      title={alias || accountId.slice(0, 5) + '...' + accountId.slice(-5)}
      accessory={
        <>
          {accountUrl && (
            <XStack
              opacity={favorite.isFavorited ? 1 : 0}
              $group-item-hover={
                favorite.isFavorited ? undefined : { opacity: 1 }
              }
            >
              <FavoriteButton url={accountUrl} />
            </XStack>
          )}
          <OnlineIndicator online={isConnected} />
        </>
      }
      menuItems={menuItems}
    />
  )
}

function ErrorPage({ }: { error: any }) {
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
  const myAccount = useMyAccount_deprecated()
  const allAccounts = contacts.data?.accounts || []
  const trustedAccounts = allAccounts.filter(
    (account) => account.isTrusted && account.id !== myAccount.data?.id,
  )
  const untrustedAccounts = allAccounts.filter(
    (account) => !account.isTrusted && !!account.profile?.alias, // hide contacts without an alias because this is confusing for users
  )
  const deleteEntity = useDeleteDialog()
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
          renderItem={({ item }) => {
            return (
              <ContactItem
                key={item.id}
                account={item}
                onCopy={() => {
                  onCopy(hmId('a', item.id))
                }}
                onDelete={deleteEntity.open}
              />
            )
          }}
        />
      </MainWrapperNoScroll>
      {copyDialogContent}
      {deleteEntity.content}
      <Footer />
    </>
  )
}
