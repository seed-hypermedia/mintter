import {useAccountPublicationList} from '@mintter/app/src/models/changes'
import {useAccountWithDevices} from '@mintter/app/src/models/contacts'
import {toast} from '@mintter/app'
import {getAccountUrl} from '@mintter/app/src/utils/account-url'
import {copyTextToClipboard} from '@mintter/app'
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
  MainWrapper,
  SizableText,
  XStack,
  YStack,
} from '@mintter/ui'
import {Copy} from '@tamagui/lucide-icons'
import {ReactNode} from 'react'

function DeviceRow({
  isOnline,
  deviceId,
}: {
  isOnline: boolean
  deviceId: string
}) {
  return (
    <Dropdown.Item
      onPress={() => {
        copyTextToClipboard(deviceId)
        toast.success('Copied Device ID to clipboard')
      }}
    >
      <OnlineIndicator online={isOnline} />
      {abbreviateCid(deviceId)}
    </Dropdown.Item>
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
              <Heading>{account.profile?.alias || accountId}</Heading>
            </XStack>

            <XStack>
              <Tooltip content="Copy Account Link to clipboard">
                <Button
                  icon={Copy}
                  size="$4"
                  onPress={() => {
                    copyTextToClipboard(getAccountUrl(accountId))
                  }}
                ></Button>
              </Tooltip>
              <Dropdown.Root>
                <Dropdown.Trigger iconAfter={ChevronDown} size="$4">
                  <OnlineIndicator online={isConnected} />
                  {isConnected ? 'Connected' : 'Offline'}
                </Dropdown.Trigger>
                <Dropdown.Content align="end">
                  <Dropdown.Label>
                    <SizableText size="$3" fontWeight="700" theme="mint">
                      {pluralizer(account.devices.length, 'Device')}
                    </SizableText>
                  </Dropdown.Label>

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
                </Dropdown.Content>
              </Dropdown.Root>
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
