import React from 'react'
import {useMintter} from 'shared/mintterContext'
import {ErrorMessage} from 'components/errorMessage'
import {css} from 'emotion'
import {AuthorLabel} from './author-label'

export function Connections() {
  const {connectToPeerById, allConnections} = useMintter()

  async function handlePeerConnection() {
    const peer = window.prompt(`enter a peer address`)
    await connectToPeerById([peer])
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
        max-width: 300px;
        width: 100%;
      `}`}
    >
      <h3 className="font-semibold text-xl text-heading">Connections</h3>
      <ul>
        {resolvedData?.toObject().profilesList.map(c => (
          <>
            <li className="text-body text-sm mt-2 flex items-center">
              <div className="w-6 h-6 bg-body-muted rounded-full mr-2 flex-none" />

              {/* <a className="text-primary hover:text-primary-hover cursor-pointer text-sm hover:underline hover:cursor-not-allowed truncate">
                  {c.username}
                </a> */}
              <AuthorLabel author={c.accountId}>{c.username}</AuthorLabel>
            </li>
          </>
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
