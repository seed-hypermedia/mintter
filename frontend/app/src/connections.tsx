import * as React from 'react';
import mintter from '@mintter/api/v2/mintter_pb';
import { useConnectionList } from './mintter-hooks';
// import {ErrorMessage} from './error-message'
import { Button } from '@mintter/ui-legacy/button';
import { Box } from '@mintter/ui-legacy/box';

// TODO: fix types
export function Connections({ onConnect }: any) {
  const { data = [], isLoading, isError, error } = useConnectionList();

  if (isLoading) {
    return <p>loading...</p>;
  }

  if (isError) {
    return <p>ERROR</p>;
  }

  return (
    <div className={`w-full pt-12`} data-testid="connections">
      <h3 className="font-semibold text-heading">Connections</h3>
      {data.length === 0 ? (
        <p className="py-2 px-4 mt-4 rounded bg-background-muted text-body text-sm inline-block">
          no connections available :(
        </p>
      ) : (
        <ul aria-label="connections">
          {data.map((c) => {
            const isConnected =
              c.connectionStatus === mintter.ConnectionStatus.CONNECTED;

            return (
              <li
                key={c.accountId}
                className={`text-body text-sm mt-2 flex items-center ${
                  isConnected ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mr-2 flex-none ${connectionStatusColor(
                    c,
                  )}`}
                />

                <span
                  data-testid="connection-username"
                  className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed"
                >
                  {`${c.username} (${c.accountId.slice(-8)})`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Box css={{ marginTop: '$4', mx: '-$2' }}>
        <Button
          onClick={() => onConnect()}
          variant="primary"
          appearance="plain"
        >
          + add connection
        </Button>
      </Box>
    </div>
  );
}

function connectionStatusColor(
  connection: mintter.Profile.AsObject,
): 'bg-success' | 'bg-danger' {
  return connection.connectionStatus === mintter.ConnectionStatus.CONNECTED
    ? 'bg-success'
    : 'bg-danger';
}
