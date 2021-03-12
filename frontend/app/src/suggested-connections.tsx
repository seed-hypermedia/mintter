import * as React from 'react';
import { useSuggestedConnections } from './mintter-hooks';
import mintter from '@mintter/api/v2/mintter_pb';

// TODO: fix types
export function SuggestedConnections({ onConnect }: any) {
  const { data = [], isLoading, isError, error } = useSuggestedConnections();

  if (isLoading) {
    return <p>loading...</p>;
  }

  if (isError) {
    return <p>ERROR</p>;
  }

  return (
    <div className={`w-full pt-12`}>
      <h3 className="font-bold text-heading">Suggested Connections</h3>
      {data.length === 0 ? (
        <p className="py-2 px-4 mt-4 rounded bg-background-muted text-body text-sm inline-block">
          no suggestions available :(
        </p>
      ) : (
        <ul aria-label="suggested connections">
          {data.map((c: mintter.SuggestedProfile.AsObject) => {
            const { profile, addrsList } = c;
            const isConnected =
              profile?.connectionStatus === mintter.ConnectionStatus.CONNECTED;

            return (
              <li
                key={profile?.accountId}
                className={`text-body text-sm mt-2 flex items-center ${
                  isConnected ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mr-2 flex-none ${connectionStatusColor(
                    profile as mintter.Profile.AsObject,
                  )}`}
                />

                <div className="flex items-start justify-between group">
                  <span className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed mr-2">
                    {`${profile?.username} (${profile?.accountId.slice(-8)})`}
                  </span>
                  <button
                    onClick={() => {
                      onConnect(addrsList);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition duration-75 px-2 rounded-full bg-info hover:bg-info-hover text-white"
                  >
                    connect
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
