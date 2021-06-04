import React from 'react'
import { Device } from '@mintter/client';
import { useAccount } from '@mintter/client/hooks'
import { Box, Text } from '@mintter/ui';

export function PeerList() {
  const query = useAccount();

  if (query.isLoading) {
    return <Text>loading...</Text>;
  }

  if (query.isError) {
    console.error('PeerList error: ', query.error);
    return <Text>Error :(</Text>;
  }

  if (query.isSuccess && query.data) {
    const { devices } = query.data;
    return (
      <Box>
        {Object.entries(devices).map(
          ([id, device]: [string, Device], index: number) => (
            <Text>
              <Text
                as="span"
                color="muted"
                css={{ display: 'inline-block', marginRight: '$4' }}
              >
                {index + 1}.
              </Text>{' '}
              {device.peerId}
            </Text>
          ),
        )}
      </Box>
    );
  }

  return null;
}
