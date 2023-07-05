import {Dropdown} from '@components/dropdown'
import {useAccountPublicationList} from '@app/models/changes'
import {useAccountWithDevices} from '@app/models/contacts'
import {toast} from '@app/toast'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useNavRoute} from '@app/utils/navigation'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import Footer from '@components/footer'
import {OnlineIndicator} from '@components/indicator'
import {PublicationListItem} from '@components/publication-list-item'
import {Tooltip} from '@components/tooltip'
import {abbreviateCid, pluralizer, pluralS} from '@mintter/shared'
import {
  Button,
  ChevronDown,
  Container,
  Heading,
  MainWrapper,
  Popover,
  SizableText,
  XStack,
} from '@mintter/ui'
import {ComponentProps, ReactNode} from 'react'
import {Clipboard, Copy} from '@tamagui/lucide-icons'
import {getAccountUrl} from '@app/utils/account-url'

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

function Section({
  children,
  css,
}: {
  children: ReactNode
  css?: ComponentProps<typeof Box>['css']
}) {
  return (
    <Box
      css={{
        borderBottom: '1px solid black',
        borderColor: '$base-border-normal',
        paddingVertical: '$4',
        ...css,
      }}
    >
      {children}
    </Box>
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
          <Section
            css={{
              display: 'flex',
              gap: '$4',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
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
            {/* </Tooltip> */}
          </Section>
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
