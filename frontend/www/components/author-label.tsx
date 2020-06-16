import Tippy from '@tippyjs/react'
import {css} from 'emotion'
import {QueryResult} from 'react-query'
import {GetProfileResponse, Profile} from '@mintter/proto/mintter_pb'
import {ErrorMessage} from './errorMessage'

interface AuthorLabelProps {
  author: QueryResult<Profile>
}

export function AuthorLabel({author}: {author: QueryResult<Profile>}) {
  const {status, error, data} = author
  console.log('data', data)

  if (status === 'loading') {
    return <span>...</span>
  }

  if (status === 'error') {
    return <ErrorMessage error={error} />
  }

  const profile: Profile.AsObject = data?.toObject()
  console.log('profile', profile)

  // const profile = {
  //   accountId: '',
  //   username: '',
  // }
  return profile ? (
    <Tippy
      delay={500}
      disabled={status !== 'success'}
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
      <span className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed">
        {`${profile.username} (${profile.accountId.slice(-8)})`}
      </span>
    </Tippy>
  ) : null
}
