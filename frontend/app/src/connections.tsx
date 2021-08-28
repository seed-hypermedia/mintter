import {Button, Box, Text} from '@mintter/ui'
import {useListAccounts} from '@mintter/client/hooks'
import type {Account} from 'frontend/client/.generated/accounts/v1alpha/accounts'
import {useQuery} from 'react-query'
import {getPeerInfo} from 'frontend/client/src/networking'
import {ConnectionStatus} from 'frontend/client/.generated/networking/v1alpha/networking'
// TODO: fix types
export function Connections({onConnect}: any) {
  const {status, data, error} = useListAccounts()

  if (status == 'loading') {
    return <Text>loading...</Text>
  }

  if (status == 'error') {
    console.error('Connections error: ', error)
    return <Text>ERROR</Text>
  }

  if (status == 'success') {
    return (
      <Box data-testid="connections">
        <Text as="h3" size="7" css={{fontWeight: '$bold'}}>
          Connections
        </Text>
        {data!.length === 0 ? (
          <Text size="2">no connections available :(</Text>
        ) : (
          <Box as="ul" aria-label="connections" css={{marginTop: '$6', padding: 0}}>
            {data!.map((c: Account) => (
              <AccountItem account={c} />
            ))}
          </Box>
        )}
        <Box css={{marginTop: '$6', mx: '-$2'}}>
          <Button onClick={() => onConnect()} variant="outlined" color="primary" size="1">
            + add connection
          </Button>
        </Box>
      </Box>
    )
  }

  return null
}

export type AccountItemProps = {
  account: Account
}

function AccountItem({account}: AccountItemProps) {
  const {data} = useQuery(['ConnectionStatus', account.devices], ({queryKey}) => {
    if (Object.keys(account.devices).length > 0) {
      return getPeerInfo(queryKey[1])
    }
  })

  return (
    <Box
      as="li"
      key={account.id}
      css={{
        display: 'flex',
        gap: '$3',
        alignItems: 'center',
        // paddingHorizontal: '$3',
        // paddingVertical: '$2',
        padding: '$3',
        marginHorizontal: '-$3',
        borderRadius: '$3',
        transition: 'background 0.25s ease-in-out',
        '&:hover': {
          cursor: 'pointer',
          backgroundColor: '$background-muted',
        },
      }}
    >
      {data && (
        <Box
          css={{
            width: 12,
            height: 12,
            borderRadius: '$round',
            flex: 'none',
            backgroundColor:
              data.connectionStatus == ConnectionStatus.CONNECTED
                ? '$success-default'
                : data.connectionStatus == ConnectionStatus.NOT_CONNECTED
                ? '$danger-default'
                : '$background-default',
          }}
        />
      )}

      <Text data-testid="connection-alias">{`${account.profile?.alias} (${account.id.slice(-8)})`}</Text>
    </Box>
  )
}
