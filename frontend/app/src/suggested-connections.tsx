import { useSuggestedConnections } from '@mintter/client/hooks';
import { mintter } from '@mintter/client'
import { Text } from '@mintter/ui/text';
import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';

// TODO: fix types
export function SuggestedConnections({ onConnect }: any) {
  const { data = [], isLoading, isError, error } = useSuggestedConnections();

  if (isLoading) {
    return <Text>loading...</Text>;
  }

  if (isError) {
    return <Text>ERROR</Text>;
  }

  return (
    <div className={`w-full pt-12`}>
      <Text as="h3" size="6">
        Suggested Connections
      </Text>
      {data.length === 0 ? (
        <Text size="2">no suggestions available :(</Text>
      ) : (
        <Box as="ul" aria-label="suggested connections">
          {data.map((c: mintter.SuggestedProfile) => {
            const { profile, addrs } = c;
            const isConnected =
              profile?.connectionStatus === mintter.ConnectionStatus.CONNECTED;

            return (
              <Box
                as="li"
                key={profile?.accountId}
                css={{
                  opacity: isConnected ? 1 : 0.5,
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
                    backgroundColor: '$success-default',
                    // connectionStatusColor(
                    //   profile as mintter.Profile.AsObject,
                    // ) === 'bg-danger'
                    //   ? '$danger-default'
                    //   : '$success-default',
                  }}
                />

                <Box
                  css={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text>
                    {`${profile?.username} (${profile?.accountId.slice(-8)})`}
                  </Text>
                  <Button
                    onClick={() => {
                      onConnect(addrs);
                    }}
                    color="primary"
                    variant="outlined"
                    size="1"
                  >
                    connect
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </div>
  );
}
