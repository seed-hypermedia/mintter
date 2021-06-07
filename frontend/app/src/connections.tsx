import { Button, Box, Text } from '@mintter/ui';
// TODO: fix types
export function Connections({ onConnect }: any) {
  // const { data = [], isLoading, isError, error } = useConnectionList();

  // if (isLoading) {
  //   return <Text>loading...</Text>;
  // }

  // if (isError) {
  //   return <Text>ERROR</Text>;
  // }

  // return (
  //   <Box data-testid="connections">
  //     <Text as="h3" size="6">
  //       Connections
  //     </Text>
  //     {data.length === 0 ? (
  //       <Text size="2">no connections available :(</Text>
  //     ) : (
  //       <Box as="ul" aria-label="connections">
  //         {data.map((c) => {
  //           const isConnected =
  //             c.connectionStatus === mintter.ConnectionStatus.CONNECTED;

  //           return (
  //             <Box
  //               as="li"
  //               key={c.accountId}
  //               css={{
  //                 opacity: isConnected ? 1 : 0.5,
  //                 display: 'flex',
  //                 gap: '$3',
  //               }}
  //             >
  //               <Box
  //                 css={{
  //                   width: 12,
  //                   height: 12,
  //                   borderRadius: '$round',
  //                   flex: 'none',
  //                   backgroundColor:
  //                     connectionStatusColor(c) === 'danger'
  //                       ? '$danger-default'
  //                       : '$success-default',
  //                 }}
  //               />

  //               <Text data-testid="connection-username">
  //                 {`${c.username} (${c.accountId.slice(-8)})`}
  //               </Text>
  //             </Box>
  //           );
  //         })}
  //       </Box>
  //     )}
  //     <Box css={{ marginTop: '$4', mx: '-$2' }}>
  //       <Button
  //         onClick={() => onConnect()}
  //         variant="outlined"
  //         color="primary"
  //         size="1"
  //       >
  //         + add connection
  //       </Button>
  //     </Box>
  //   </Box>
  // );
  return <Text>connections. Implement!</Text>;
}
