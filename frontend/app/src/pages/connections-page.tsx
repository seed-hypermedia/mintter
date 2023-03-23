import {accountsClient, networkingClient} from '@app/api-clients'
import {queryKeys} from '@app/hooks'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import {ScrollArea} from '@components/scroll-area'
import {Text} from '@components/text'
import {Account, ConnectionStatus} from '@mintter/shared'
import {useQueries, useQuery} from '@tanstack/react-query'

function OnlineIndicator({online}: {online: boolean}) {
  return (
    <Box
      css={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        backgroundColor: online ? 'var(--success-active)' : 'transparent',
      }}
    />
  )
}
function ContactItem({account}: {account: Account}) {
  const peerInfoQueries = useQueries({
    queries: Object.entries(account.devices).map(([, device]) => ({
      queryKey: [queryKeys.GET_PEER_INFO, account.id],
      queryFn: async () => {
        return await networkingClient.getPeerInfo({peerId: device.peerId})
      },
    })),
  })
  const isConnected = peerInfoQueries.some(
    (peerInfoQuery) =>
      peerInfoQuery.data?.connectionStatus == ConnectionStatus.CONNECTED,
  )

  return (
    <Box>
      <Avatar
        accountId={account.id}
        size={2}
        alias={account.profile?.alias || ''}
      />
      <Box css={{display: 'flex', flexDirection: 'column', gap: '$2'}}>
        <Text fontWeight="bold">{account.profile?.alias}</Text>
        <Text
          color="muted"
          css={{
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          {account.profile?.bio}
        </Text>
        <Text size="1" fontWeight="bold">
          <OnlineIndicator online={isConnected} />
          {isConnected ? '(connected)' : ''}
        </Text>
        <Text
          size="1"
          css={{
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          <b>Acc. ID:</b> {account.id}
        </Text>
      </Box>
    </Box>
  )
}

export default function ConnectionsPage() {
  const contacts = useQuery({
    queryKey: [queryKeys.GET_CONTACTS_LIST],
    queryFn: async () => {
      return await accountsClient.listAccounts({})
    },
  })
  const accounts = contacts.data?.accounts || []
  return (
    <ScrollArea>
      <Box>
        {accounts.map((account) => {
          return <ContactItem key={account.id} account={account} />
        })}
      </Box>
      <span>coming soon. {JSON.stringify(contacts.data)}.</span>
    </ScrollArea>
  )
}
