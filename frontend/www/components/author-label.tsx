import * as React from 'react'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {Tooltip} from './tooltip'
import {Text} from './text'

interface AuthorLabelProps {
  author: Profile.AsObject
  className?: string
}

export function AuthorLabel({author}: AuthorLabelProps) {
  if (!author) {
    return <Text>...</Text>
  }

  const {accountId, username} = author

  return (
    <Tooltip content={accountId}>
      <Text>{`${username} (${accountId.slice(-8)})`}</Text>
    </Tooltip>
  )
}
