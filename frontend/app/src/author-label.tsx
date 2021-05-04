import * as React from 'react';
import type mintter from '@mintter/api/v2/mintter_pb';
import { Tooltip } from './components/tooltip';
import { Text } from '@mintter/ui/text';

interface AuthorLabelProps {
  author: mintter.Profile.AsObject;
  className?: string;
}

export function AuthorLabel({ author }: AuthorLabelProps) {
  if (!author) {
    return <Text>...</Text>;
  }

  const { accountId, username } = author;

  return (
    <Tooltip content={accountId}>
      <Text>{`${username} (${accountId.slice(-8)})`}</Text>
    </Tooltip>
  );
}
