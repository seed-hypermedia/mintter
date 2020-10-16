import Tippy from '@tippyjs/react'
import {css} from 'emotion'
import {QueryResult} from 'react-query'
import {GetProfileResponse, Profile} from '@mintter/proto/mintter_pb'
import {ErrorMessage} from './errorMessage'

interface AuthorLabelProps {
  author: Profile.AsObject
}

export function AuthorLabel({author}: AuthorLabelProps) {
  console.log('AuthorLabel -> author', author)

  if (!author) {
    return <span>...</span>
  }

  const {accountId, username} = author

  return (
    <Tippy
      delay={500}
      content={
        <span
          className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
            background-color: #333;
            color: #ccc;
          `}`}
        >
          {accountId}
        </span>
      }
    >
      <span className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed">
        {`${username} (${accountId.slice(-8)})`}
      </span>
    </Tippy>
  )
}
