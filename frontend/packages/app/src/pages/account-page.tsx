import {useAccountPublicationList} from '@mintter/app/src/models/changes'
import {useAccountWithDevices} from '@mintter/app/src/models/contacts'
import {toast} from '@mintter/app/src/toast'
import {getAccountUrl} from '@mintter/app/src/utils/account-url'
import {copyTextToClipboard} from '@mintter/app/src/copy-to-clipboard'
import {useNavRoute} from '@mintter/app/src/utils/navigation'
import {Avatar} from '@mintter/app/src/components/avatar'
import {Dropdown} from '@mintter/app/src/components/dropdown'
import Footer from '@mintter/app/src/components/footer'
import {OnlineIndicator} from '@mintter/app/src/components/indicator'
import {PublicationListItem} from '@mintter/app/src/components/publication-list-item'
import {Tooltip} from '@mintter/app/src/components/tooltip'
import {abbreviateCid, pluralizer} from '@mintter/shared'
import {
  Button,
  ChevronDown,
  Container,
  Heading,
  ListItem,
  MainWrapper,
  Popover,
  SizableText,
  XStack,
  YGroup,
  YStack,
} from '@mintter/ui'
import {Copy} from '@tamagui/lucide-icons'
import {ReactNode} from 'react'
import {MenuItem} from '../components/dropdown'

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
    >
      {children}
    </YStack>
  )
}

function AccountDocuments({accountId}: {accountId: string}) {
  const list = useAccountPublicationList(accountId)
  return (
    <Section>
      {list.data?.map((doc) => {
        return (
          <PublicationListItem
            key={doc.document?.id}
            publication={doc}
            hasDraft={undefined}
          />
        )
      })}
    </Section>
  )
}

export default function AccountPage() {
  const route = useNavRoute()
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const account = useAccountWithDevices(accountId)
  const deviceCount = account.devices.length
  const connectedCount = account.devices?.filter(
    (device) => device.isConnected,
  ).length
  const isConnected = !!connectedCount
  return (
    <>
      <MainWrapper>
        <Container>
          <XStack gap="$4" alignItems="center" justifyContent="space-between">
            <XStack gap="$4" alignItems="center">
              <Avatar
                accountId={accountId}
                size="$6"
                alias={account.profile?.alias || ''}
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
                <Popover.Content padding={0} elevation="$3">
                  <YGroup>
                    <YGroup.Item>
                      <XStack paddingHorizontal="$4">
                        <MenuItem
                          disabled
                          title={pluralizer(account.devices.length, 'Device')}
                          size="$1"
                          fontWeight="700"
                          theme="mint"
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
            </XStack>
          </XStack>
          {account.profile?.bio && (
            <Section>
              <span>{account.profile?.bio}</span>
            </Section>
          )}
          <AccountDocuments accountId={accountId} />
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
