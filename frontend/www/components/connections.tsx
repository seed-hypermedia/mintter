import React from 'react'
import {css} from 'emotion'
import Tippy from '@tippyjs/react'
import {Profile, ConnectionStatus} from '@mintter/api/v2/mintter_pb'
import {useConnectionList} from 'shared/profileContext'
import {ErrorMessage} from './errorMessage'

export function Connections({onConnect}) {
  const {data = [], isLoading, isError, error} = useConnectionList()
  if (isLoading) {
    return <p className="text-body text-sm mt-2">loading...</p>
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  if (data.length === 0) {
    return (
      <p className="py-2 px-4 mt-4 rounded bg-background-muted text-body text-sm inline-block">
        no connections available :(
      </p>
    )
  }

  return (
    <div className={`w-full px-4 pt-12`} data-testid="connections">
      <h3 className="font-semibold text-xl text-heading">Connections</h3>
      <ul>
        {data.map(c => {
          const isConnected = c.connectionStatus === ConnectionStatus.CONNECTED

          return (
            <li
              key={c.accountId}
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
                    c,
                  )}`}
                />
              </Tippy>
              <Tippy
                delay={500}
                content={
                  <span
                    className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                      background-color: #333;
                      color: #ccc;
                    `}`}
                  >
                    {c.accountId}
                  </span>
                }
              >
                <span
                  data-testid="connection-username"
                  className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed"
                >
                  {`${c.username} (${c.accountId.slice(-8)})`}
                </span>
              </Tippy>
            </li>
          )
        })}
      </ul>
      <button
        onClick={onConnect}
        className="text-primary hover:text-primary-hover cursor-pointer text-sm mt-4 underline"
      >
        + add connection
      </button>
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
