import React from 'react'
import {useProfile} from 'shared/profileContext'
import {ErrorMessage} from 'components/errorMessage'
import {css} from 'emotion'
import {AuthorLabel} from './author-label'
import Tippy from '@tippyjs/react'
import {useToasts} from 'react-toast-notifications'

export function Connections() {
  const {connectToPeerById, allConnections} = useProfile()
  const {addToast, updateToast} = useToasts()

  async function handlePeerConnection() {
    const peer = window.prompt(`enter a peer address`)
    const toast = addToast('Stablishing connection...', {
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
      updateToast(toast, {
        content: err.message,
        appearance: 'error',
      })
    }
  }

  const {status, error, resolvedData} = allConnections()

  if (status === 'loading') {
    return <p className="text-body text-sm mt-2">loading...</p>
  }

  if (status === 'error') {
    return <ErrorMessage error={error} />
  }

  return (
    <div
      className={`pt-10 px-4 lg:pl-20 lg:pr-16 ${css`
        max-width: 360px;
        width: 100%;
      `}`}
    >
      <h3 className="font-semibold text-xl text-heading">Connections</h3>
      <ul>
        {resolvedData?.toObject().profilesList.map(c => (
          <li
            key={c.accountId}
            className="text-body text-sm mt-2 flex items-center"
          >
            <div className="w-6 h-6 bg-body-muted rounded-full mr-2 flex-none" />
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
        ))}
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
