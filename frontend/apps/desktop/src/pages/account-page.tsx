import {useAccount, useAccountWithDevices} from '@app/hooks/contacts'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import Footer from '@components/footer'
import {Heading} from '@components/heading'
import {OnlineIndicator} from '@components/indicator'
import PageContainer from '@components/page-container'
import {Text} from '@components/text'
import {ConnectionStatus, PeerInfo} from '@mintter/shared'
import {ComponentProps, ReactNode} from 'react'
import {useRoute} from 'wouter'

function PeerRow({peer}: {peer: PeerInfo}) {
  return (
    <Box css={{display: 'flex', alignItems: 'center'}}>
      <OnlineIndicator
        online={peer.connectionStatus === ConnectionStatus.CONNECTED}
      />
      <Text fontWeight={'bold'} css={{marginInline: '$3'}}>
        {peer.accountId}
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
export default function AccountPage() {
  const [, params] = useRoute('/account/:id')
  const accountId = params?.id
  if (!accountId) throw new Error('Invalid route, no account id')
  const account = useAccountWithDevices(accountId)
  return (
    <>
      <PageContainer>
        <Section css={{display: 'flex', gap: '$4', alignItems: 'center'}}>
          <Avatar
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
          {account.peers.map((peer) => {
            if (!peer) return null
            return <PeerRow key={peer?.accountId} peer={peer} />
          })}
        </Section>
      </PageContainer>
      <Footer />
    </>
  )
}
