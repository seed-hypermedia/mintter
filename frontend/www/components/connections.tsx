import React from 'react'
import {useProfile} from 'shared/profileContext'
import {ErrorMessage} from 'components/errorMessage'
import {css} from 'emotion'
import {AuthorLabel} from './author-label'
import Tippy from '@tippyjs/react'
import {useToasts} from 'react-toast-notifications'
import {Profile, ConnectionStatus} from '@mintter/proto/mintter_pb'

export function Connections() {
  const {connectToPeerById, allConnections} = useProfile()
  const {addToast, updateToast, removeToast} = useToasts()

  async function handlePeerConnection() {
    const peer = window.prompt(`enter a peer address`)
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

  const {status, error, resolvedData} = allConnections()

  if (status === 'loading') {
    return <p className="text-body text-sm mt-2">loading...</p>
  }

  if (status === 'error') {
    return <ErrorMessage error={error} />
  }

  console.log('connections', resolvedData?.toObject())

  return (
    <div
      className={`pt-10 px-4 lg:pl-20 lg:pr-16 ${css`
        max-width: 360px;
        width: 100%;
      `}`}
    >
      <h3 className="font-semibold text-xl text-heading">Connections</h3>
      <ul>
        {resolvedData?.toObject().profilesList.map(c => {
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
                <span className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed">
                  {`${c.username} (${c.accountId.slice(-8)})`}
                </span>
              </Tippy>
            </li>
          )
        })}
      </ul>
      <button
        onClick={handlePeerConnection}
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
