import React from 'react'
import {useProfile} from 'shared/profileContext'
import {ErrorMessage} from 'components/errorMessage'
import {css} from 'emotion'
import {AuthorLabel} from './author-label'
import Tippy from '@tippyjs/react'
import {useToasts} from 'react-toast-notifications'
import {Profile, ConnectionStatus} from '@mintter/proto/mintter_pb'

export function SuggestedConnections() {
  const {connectToPeerById, listSuggestedConnections} = useProfile()
  const {addToast, updateToast, removeToast} = useToasts()

  async function handlePeerConnection(peer) {
    let toast

    if (peer) {
      const toast = addToast('Connecting to peer...', {
        appearance: 'info',
        autoDismiss: false,
      })
      try {
        await connectToPeerById(peer.split(','))
        updateToast(toast, {
          content: 'Connection established successfuly!',
          appearance: 'success',
          autoDismiss: true,
        })
      } catch (err) {
        removeToast(toast, () => {
          addToast(err.message, {
            appearance: 'error',
          })
        })
      }
    }
  }

  const {status, error, resolvedData} = listSuggestedConnections()

  if (status === 'loading') {
    return <p className="text-body text-sm mt-2">loading...</p>
  }

  if (status === 'error') {
    return <ErrorMessage error={error} />
  }

  const list = resolvedData?.toObject().profilesList

  return (
    <div
      className={`pt-10 px-4 ${css`
        max-width: 360px;
        width: 100%;
      `}`}
    >
      <h3 className="font-bold text-heading">Suggested Connections</h3>
      {list.length === 0 ? (
        <p className="p-4 mt-4 rounded bg-background-muted text-body">no suggestions available :(</p>
      ) : (
        <ul>
          {list.map(c => {
            const isConnected =
              c.connectionStatus === ConnectionStatus.CONNECTED

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
                  delay={1000}
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
                  <div className="flex items-center group">
                    <span className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed mr-2">
                      {`${c.username} (${c.accountId.slice(-8)})`}
                    </span>
                    <button
                      onClick={() => handlePeerConnection(c.addrsList)}
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
