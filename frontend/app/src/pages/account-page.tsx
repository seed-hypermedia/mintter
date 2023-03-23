import {useAccount, useAccountWithDevices} from '@app/hooks/contacts'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import {Heading} from '@components/heading'
import {OnlineIndicator} from '@components/indicator'
import {ScrollArea} from '@components/scroll-area'
import {Text} from '@components/text'
import {ConnectionStatus, PeerInfo} from '@mintter/shared'
import {useRoute} from 'wouter'

function PeerRow({peer}: {peer: PeerInfo}) {
  return (
    <Box css={{display: 'flex', alignItems: 'center'}}>
      <OnlineIndicator
        online={peer.connectionStatus === ConnectionStatus.CONNECTED}
      />
      <Text fontWeight={'bold'}>{peer.accountId}</Text>
    </Box>
  )
}
export default function AccountPage() {
  const [, params] = useRoute('/account/:id')
  const accountId = params?.id
  if (!accountId) throw new Error('Invalid route, no account id')
  const account = useAccountWithDevices(accountId)
  return (
    <ScrollArea>
      <Avatar
        accountId={accountId}
        size={2}
        alias={account.profile?.alias || ''}
      />
      <Heading>{account.profile?.alias || accountId}</Heading>
      <span>{account.profile?.bio}</span>
      {account.profile?.email ? (
        <span>Email: {account.profile?.email}</span>
      ) : null}
      <Text fontWeight={'bold'}>Devices</Text>
      {account.peers.map((peer) => {
        if (!peer) return null
        return <PeerRow key={peer?.accountId} peer={peer} />
      })}
    </ScrollArea>
  )
}
