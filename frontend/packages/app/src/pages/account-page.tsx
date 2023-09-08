import {useAccountGroups} from '@mintter/app/models/groups'
import {Avatar} from '@mintter/app/src/components/avatar'
import Footer from '@mintter/app/src/components/footer'
import {OnlineIndicator} from '@mintter/app/src/components/indicator'
import {PublicationListItem} from '@mintter/app/src/components/publication-list-item'
import {Tooltip} from '@mintter/ui'
import {copyTextToClipboard} from '@mintter/app/src/copy-to-clipboard'
import {useAccountPublicationList} from '@mintter/app/src/models/changes'
import {useAccountWithDevices} from '@mintter/app/src/models/contacts'
import {toast} from '@mintter/app/src/toast'
import {getAccountUrl} from '@mintter/app/src/utils/account-url'
import {useNavRoute} from '@mintter/app/src/utils/navigation'
import {useNavigate} from '@mintter/app/utils/navigation'
import {abbreviateCid, pluralizer} from '@mintter/shared'
import {
  Button,
  ChevronDown,
  Container,
  ListItem,
  MainWrapper,
  Popover,
  SizableText,
  XStack,
  YGroup,
  YStack,
} from '@mintter/ui'
import {CheckCircle, Copy, PlusCircle, XCircle} from '@tamagui/lucide-icons'
import {ReactNode, useState} from 'react'
import {MenuItem} from '../components/dropdown'
import {useSetTrusted} from '../models/accounts'
import {getAvatarUrl} from '../utils/account-url'

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

function AccountDocuments({
  accountId,
  isTrusted,
}: {
  accountId: string
  isTrusted?: boolean
}) {
  const list = useAccountPublicationList(accountId)
  return (
    <Section>
      {list.data?.map((pub) => {
        return (
          <PublicationListItem
            pubContext={isTrusted ? {key: 'trusted'} : null}
            key={pub.document?.id}
            publication={pub}
            hasDraft={undefined}
            openRoute={{
              key: 'publication',
              documentId: pub.document?.id!,
              versionId: pub.version,
              pubContext: isTrusted ? {key: 'trusted'} : null,
            }}
          />
        )
      })}
    </Section>
  )
}

function AccountTrustButton({
  accountId,
  isTrusted,
}: {
  accountId: string
  isTrusted?: boolean
}) {
  const [hovering, setHovering] = useState(false)
  const setTrusted = useSetTrusted()
  if (!isTrusted) {
    return (
      <Button
        size="$2"
        icon={PlusCircle}
        onPress={() => {
          setTrusted.mutate({accountId, isTrusted: true})
        }}
      >
        Trust Account
      </Button>
    )
  }
  return (
    <Button
      size="$2"
      theme={hovering ? 'red' : 'green'}
      icon={hovering ? XCircle : CheckCircle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onPress={() => {
        setTrusted.mutate({accountId, isTrusted: false})
      }}
    >
      {hovering ? 'Untrust Account' : 'Trusted Account'}
    </Button>
  )
}

export default function AccountPage() {
  const route = useNavRoute()
  const nav = useNavigate('push')
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const account = useAccountWithDevices(accountId)
  const {data: groups} = useAccountGroups(accountId)
  const deviceCount = account.devices.length
  const connectedCount = account.devices?.filter((device) => device.isConnected)
    .length
  const isConnected = !!connectedCount
  return (
    <>
      <MainWrapper>
        <Container>
          <XStack gap="$4" alignItems="center" justifyContent="space-between">
            <XStack gap="$4" alignItems="center">
              <Avatar
                id={accountId}
                size="$6"
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
                {account.profile?.alias || 'Untitled Account'}
              </SizableText>
            </XStack>

            <XStack space="$2">
              <Tooltip content="Copy Account Link to clipboard">
                <Button
                  icon={Copy}
                  size="$2"
                  onPress={() => {
                    copyTextToClipboard(getAccountUrl(accountId))
                  }}
                />
              </Tooltip>
              <Popover placement="bottom-end">
                <Popover.Trigger asChild>
                  <Button
                    icon={<OnlineIndicator online={isConnected} />}
                    iconAfter={ChevronDown}
                    size="$2"
                  >
                    {isConnected ? 'Connected' : 'Offline'}
                  </Button>
                </Popover.Trigger>
                <Popover.Content
                  padding={0}
                  elevation="$2"
                  enterStyle={{y: -10, opacity: 0}}
                  exitStyle={{y: -10, opacity: 0}}
                  elevate
                  animation={[
                    'quick',
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
              <AccountTrustButton
                accountId={accountId}
                isTrusted={account.isTrusted}
              />
            </XStack>
          </XStack>
          {account.profile?.bio && (
            <Section>
              <SizableText size="$4">{account.profile?.bio}</SizableText>
              {groups?.items.length ? (
                <XStack alignItems="center" space>
                  <SizableText size="$2" fontWeight="bold">
                    Groups
                  </SizableText>
                  {groups.items.map((item) => (
                    <Button
                      size="$2"
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
          )}

          <AccountDocuments
            isTrusted={account.isTrusted}
            accountId={accountId}
          />
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
