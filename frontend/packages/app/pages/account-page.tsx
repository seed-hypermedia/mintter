import {Avatar} from '@mintter/app/components/avatar'
import Footer from '@mintter/app/components/footer'
import {OnlineIndicator} from '@mintter/app/components/indicator'
import {PublicationListItem} from '@mintter/app/components/publication-list-item'
import {copyTextToClipboard} from '@mintter/app/copy-to-clipboard'
import {useAccountWithDevices} from '@mintter/app/models/contacts'
import {useAccountGroups} from '@mintter/app/models/groups'
import {toast} from '@mintter/app/toast'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {Profile, abbreviateCid, pluralizer} from '@mintter/shared'
import {idToUrl} from '@mintter/shared/src/utils/entity-id-url'
import {
  Button,
  ChevronDown,
  List,
  ListItem,
  Popover,
  SizableText,
  XStack,
  YGroup,
  YStack,
} from '@mintter/ui'
import {PageContainer} from '@mintter/ui/src/container'
import {Pencil} from '@tamagui/lucide-icons'
import {ReactNode, useMemo} from 'react'
import {AccountTrustButton} from '../components/account-trust'
import {MenuItem} from '../components/dropdown'
import {useEditProfileDialog} from '../components/edit-profile-dialog'
import {copyLinkMenuItem} from '../components/list-item'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {PinAccountButton} from '../components/pin-entity'
import {CopyReferenceButton} from '../components/titlebar-common'
import {useAllAccounts, useMyAccount} from '../models/accounts'
import {useAccountPublications} from '../models/documents'
import {useGatewayUrl} from '../models/gateway-settings'
import {getAvatarUrl} from '../utils/account-url'
import {useNavigate} from '../utils/useNavigate'

function DeviceRow({
  isOnline,
  deviceId,
}: {
  isOnline: boolean
  deviceId: string
}) {
  return (
    <YGroup.Item>
      <ListItem
        onPress={() => {
          copyTextToClipboard(deviceId)
          toast.success('Copied Device ID to clipboard')
        }}
      >
        <OnlineIndicator online={isOnline} />
        {abbreviateCid(deviceId)}
      </ListItem>
    </YGroup.Item>
  )
}

function Section({children}: {children: ReactNode}) {
  return (
    <YStack
      borderBottomWidth={1}
      borderBottomColor="black"
      borderColor="$gray6"
      paddingVertical="$4"
      space
    >
      {children}
    </YStack>
  )
}

export function getAccountName(profile: Profile | undefined) {
  if (!profile) return ''
  return profile.alias || 'Untitled Account'
}

export default function AccountPage() {
  const route = useNavRoute()
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const list = useAccountPublications(accountId)
  const accounts = useAllAccounts()
  const data = useMemo(() => {
    function lookupAccount(accountId: string | undefined) {
      return (
        (accountId &&
          accounts.data?.accounts.find((acc) => acc.id === accountId)) ||
        accountId
      )
    }
    return list.data?.publications
      .sort((a, b) => {
        return (
          Number(b?.document?.updateTime?.seconds) -
          Number(a?.document?.updateTime?.seconds)
        )
      })
      .map((pub) => {
        return {
          publication: pub,
          author: lookupAccount(pub?.document?.author),
          editors: pub?.document?.editors?.map(lookupAccount) || [],
        }
      })
  }, [list.data, accounts.data])
  const gwUrl = useGatewayUrl()
  return (
    <>
      <MainWrapperNoScroll>
        <List
          header={<AccountPageHeader />}
          items={data || []}
          renderItem={({item}) => {
            const {publication, author, editors} = item
            const docId = publication.document?.id
            if (!docId) return null
            return (
              <PublicationListItem
                key={docId}
                publication={publication}
                hasDraft={undefined}
                author={author}
                editors={editors}
                menuItems={() => [
                  copyLinkMenuItem(
                    idToUrl(docId, gwUrl.data, publication.version),
                    'Publication',
                  ),
                ]}
                openRoute={{
                  key: 'publication',
                  documentId: docId,
                  versionId: publication.version,
                  variant: {
                    key: 'authors',
                    authors: [accountId],
                  },
                }}
              />
            )
          }}
        />
      </MainWrapperNoScroll>
      <Footer />
    </>
  )
}

function AccountPageHeader() {
  const route = useNavRoute()
  const nav = useNavigate('push')
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const account = useAccountWithDevices(accountId)
  const {data: groups} = useAccountGroups(accountId)
  const myAccount = useMyAccount()
  const connectedCount = account.devices?.filter((device) => device.isConnected)
    .length
  const isConnected = !!connectedCount
  const isMe = myAccount.data?.id === accountId
  const editProfileDialog = useEditProfileDialog()
  return (
    <PageContainer>
      <XStack gap="$4" alignItems="center" justifyContent="space-between">
        <XStack gap="$4" alignItems="center">
          <Avatar
            id={accountId}
            size={60}
            label={account.profile?.alias}
            url={getAvatarUrl(account.profile?.avatar)}
          />

          <SizableText
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            size="$5"
            fontWeight="700"
          >
            {getAccountName(account.profile)}
          </SizableText>
        </XStack>

        <XStack space="$2">
          <CopyReferenceButton />
          {isMe ? null : <PinAccountButton accountId={accountId} />}
          {isMe ? (
            <Button
              size="$2"
              icon={Pencil}
              onPress={() => {
                editProfileDialog.open(true)
              }}
            >
              Edit Profile
            </Button>
          ) : null}
          <Popover placement="bottom-end">
            <Popover.Trigger asChild>
              <Button
                icon={isMe ? null : <OnlineIndicator online={isConnected} />}
                iconAfter={ChevronDown}
                size="$2"
              >
                {isMe ? 'My Devices' : isConnected ? 'Connected' : 'Offline'}
              </Button>
            </Popover.Trigger>
            <Popover.Content
              padding={0}
              elevation="$2"
              enterStyle={{y: -10, opacity: 0}}
              exitStyle={{y: -10, opacity: 0}}
              elevate
              animation={[
                'fast',
                {
                  opacity: {
                    overshootClamping: true,
                  },
                },
              ]}
            >
              <YGroup>
                <YGroup.Item>
                  <XStack paddingHorizontal="$4">
                    <MenuItem
                      disabled
                      title={pluralizer(account.devices.length, 'Device')}
                      size="$1"
                      fontWeight="700"
                    />
                  </XStack>
                </YGroup.Item>
                {account.devices.map((device) => {
                  if (!device) return null
                  return (
                    <DeviceRow
                      key={device.deviceId}
                      isOnline={device.isConnected}
                      deviceId={device.deviceId}
                    />
                  )
                })}
              </YGroup>
            </Popover.Content>
          </Popover>

          {isMe ? null : (
            <AccountTrustButton
              accountId={accountId}
              isTrusted={account.isTrusted}
            />
          )}
        </XStack>
      </XStack>
      <Section>
        <SizableText size="$4">{account.profile?.bio}</SizableText>
        {groups?.items.length ? (
          <XStack alignItems="center" space flexWrap="wrap">
            <SizableText size="$2" marginBottom="$2" fontWeight="bold">
              Groups
            </SizableText>
            {groups.items.map((item) => (
              <Button
                size="$2"
                marginBottom="$2"
                key={item.group?.id}
                theme="blue"
                onPress={() =>
                  item.group
                    ? nav({key: 'group', groupId: item.group.id})
                    : null
                }
              >
                {item.group?.title}
              </Button>
            ))}
          </XStack>
        ) : null}
      </Section>

      {editProfileDialog.content}
    </PageContainer>
  )
}
