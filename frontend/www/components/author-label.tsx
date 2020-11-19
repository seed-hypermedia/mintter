import Tippy from '@tippyjs/react'
import {css} from 'emotion'
import {Profile} from '@mintter/api/v2/mintter_pb'

interface AuthorLabelProps {
  author: Profile.AsObject
  className?: string
}

export function AuthorLabel({author, className = ''}: AuthorLabelProps) {
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
      <span
        className={`text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed ${className}`}
      >
        {`${username} (${accountId.slice(-8)})`}
      </span>
    </Tippy>
  )
}
