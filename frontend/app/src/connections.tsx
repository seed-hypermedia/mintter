import {Button, Box, Text} from '@mintter/ui'
import {useListAccounts} from '@mintter/client/hooks'
// TODO: fix types
export function Connections({onConnect}: any) {
  const {isLoading, isError, data} = useListAccounts()

  if (isLoading) {
    return <Text>loading...</Text>
  }

  if (isError) {
    return <Text>ERROR</Text>
  }

  return (
    <Box data-testid="connections">
      <Text
        as="h3"
        size="7"
        // TODO: fix types
        // @ts-ignore
        css={{fontWeight: '$bold'}}
      >
        Connections
      </Text>
      {data.length === 0 ? (
        <Text size="2">no connections available :(</Text>
      ) : (
        <Box as="ul" aria-label="connections" css={{margin: 0, padding: 0}}>
          {data.map((c) => {
            // const isConnected = c.connectionStatus === mintter.ConnectionStatus.CONNECTED

            return (
              <Box
                as="li"
                key={c.accountId}
                css={{
                  // opacity: isConnected ? 1 : 0.5,
                  display: 'flex',
                  gap: '$3',
                }}
              >
                <Box
                  css={{
                    width: 12,
                    height: 12,
                    borderRadius: '$round',
                    flex: 'none',
                    // backgroundColor: connectionStatusColor(c) === 'danger' ? '$danger-default' : '$success-default',
                  }}
                />

                <Text data-testid="connection-alias">{`${c.profile?.alias} (${c.id.slice(-8)})`}</Text>
              </Box>
            )
          })}
        </Box>
      )}
      <Box css={{marginTop: '$4', mx: '-$2'}}>
        <Button onClick={() => onConnect()} variant="outlined" color="primary" size="1">
          + add connection
        </Button>
      </Box>
    </Box>
  )
}
