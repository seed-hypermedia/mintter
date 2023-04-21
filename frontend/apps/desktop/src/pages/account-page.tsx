import {useAccountPublicationList} from '@app/models/changes'
import {useAccountWithDevices} from '@app/models/contacts'
import {useNavRoute} from '@app/utils/navigation'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import Footer from '@components/footer'
import {OnlineIndicator} from '@components/indicator'
import {PublicationListItem} from '@components/publication-list-item'
import {Container, Heading, MainWrapper, SizableText, XStack} from '@mintter/ui'
import {ComponentProps, ReactNode} from 'react'

function DeviceRow({
  isOnline,
  deviceId,
}: {
  isOnline: boolean
  deviceId: string
}) {
  return (
    <XStack alignItems="center">
      <OnlineIndicator online={isOnline} />
      <SizableText fontWeight="700" marginHorizontal="$3">
        {deviceId}
      </SizableText>
    </XStack>
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
  return (
    <>
      <MainWrapper>
        <Container>
          <Section css={{display: 'flex', gap: '$4', alignItems: 'center'}}>
            <Avatar
              accountId={accountId}
              size="$6"
              alias={account.profile?.alias || ''}
            />
            <Heading>{account.profile?.alias || accountId}</Heading>
          </Section>
          {account.profile?.bio && (
            <Section>
              <span>{account.profile?.bio}</span>
            </Section>
          )}
          <Section>
            <SizableText fontWeight="700">Devices</SizableText>
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
          </Section>
          <AccountDocuments accountId={accountId} />
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
