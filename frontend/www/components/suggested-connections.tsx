import React from 'react'
import {useSuggestedConnections} from 'shared/profileContext'

import {css} from 'emotion'

import Tippy from '@tippyjs/react'
import {
  Profile,
  ConnectionStatus,
  SuggestedProfile,
} from '@mintter/api/v2/mintter_pb'
import {ErrorMessage} from './errorMessage'

export function SuggestedConnections({onConnect}) {
  const {data = [], isLoading, isError, error} = useSuggestedConnections()

  if (isLoading) {
    return <p className="text-body text-sm mt-2">loading...</p>
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  return (
    <div className={`w-full px-4 pt-12`}>
      <h3 className="font-bold text-heading">Suggested Connections</h3>
      {data.length === 0 ? (
        <p className="py-2 px-4 mt-4 rounded bg-background-muted text-body text-sm inline-block">
          no suggestions available :(
        </p>
      ) : (
        <ul>
          {data.map((c: SuggestedProfile.AsObject) => {
            const {profile, addrsList} = c
            const isConnected =
              profile.connectionStatus === ConnectionStatus.CONNECTED

            return (
              <li
                key={profile.accountId}
                className={`text-body text-sm mt-2 flex items-center ${
                  isConnected ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <Tippy
                  content={
                    <span
                      className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                        background-color: #333;
                        color: #ccc;
                      `}`}
                    >
                      {isConnected ? 'connected' : 'not connected'}
                    </span>
                  }
                >
                  <div
                    className={`w-2 h-2 rounded-full mr-2 flex-none ${connectionStatusColor(
                      profile,
                    )}`}
                  />
                </Tippy>
                <Tippy
                  delay={1000}
                  content={
                    <span
                      className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                        background-color: #333;
                        color: #ccc;
                      `}`}
                    >
                      {profile.accountId}
                    </span>
                  }
                >
                  <div className="flex items-start justify-between group">
                    <span className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed mr-2">
                      {`${profile.username} (${profile.accountId.slice(-8)})`}
                    </span>
                    <button
                      onClick={() => onConnect(addrsList)}
                      className="opacity-0 group-hover:opacity-100 transition duration-75 px-2 rounded-full bg-info hover:bg-info-hover text-white"
                    >
                      connect
                    </button>
                  </div>
                </Tippy>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function connectionStatusColor(
  connection: Profile.AsObject,
): 'bg-success' | 'bg-danger' {
  return connection.connectionStatus === ConnectionStatus.CONNECTED
    ? 'bg-success'
    : 'bg-danger'
}
