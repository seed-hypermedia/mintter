import {useAccountPublicationList} from '@app/hooks'
import {useAccountWithDevices} from '@app/hooks/contacts'
import {useNavRoute} from '@app/utils/navigation'
import {Box} from '@components/box'
import Footer from '@components/footer'
import {Heading} from '@components/heading'
import {OnlineIndicator} from '@components/indicator'
import {PublicationListItem} from '@components/publication-list-item'
import {Text} from '@components/text'
import {ComponentProps, ReactNode} from 'react'
import {Container, MainWrapper, UIAvatar} from '@mintter/ui'
import {PageProps} from './base'

function DeviceRow({
  isOnline,
  deviceId,
}: {
  isOnline: boolean
  deviceId: string
}) {
  return (
    <Box css={{display: 'flex', alignItems: 'center'}}>
      <OnlineIndicator online={isOnline} />
      <Text fontWeight={'bold'} css={{marginInline: '$3'}}>
        {deviceId}
      </Text>
    </Box>
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

export default function AccountPage(props: PageProps) {
  const route = useNavRoute()
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const account = useAccountWithDevices(accountId)
  return (
    <>
      <MainWrapper>
        <Container>
          <Section css={{display: 'flex', gap: '$4', alignItems: 'center'}}>
            <UIAvatar
              accountId={accountId}
              size={3}
              alias={account.profile?.alias || ''}
            />
            <Heading>{account.profile?.alias || accountId}</Heading>
          </Section>
          {account.profile?.bio && (
            <Section>
              <span>{account.profile?.bio}</span>
            </Section>
          )}
          {account.profile?.email ? (
            <span>Email: {account.profile?.email}</span>
          ) : null}
          <Section>
            <Text fontWeight={'bold'}>Devices</Text>
            {account.devices.map((device) => {
              if (!device) return null
              return (
                <DeviceRow
                  key={device.deviceId}
                  isOnline={device.isConnected}
                  deviceId={device.deviceId} // what is difference between peerId and deviceId?
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
