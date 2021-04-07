import * as React from 'react';
// import Seo from 'components/seo'
import { DocumentList } from '../document-list';
import { useDraftsList } from '@mintter/hooks';
import { deleteDraft } from '@mintter/client';
// import { Icons } from 'components/icons';
import { Button } from '@mintter/ui/button';
import { Separator } from '@components/separator';
import { Text } from '@mintter/ui/text';
import { Box } from '@mintter/ui/box';
import { useHistory, useRouteMatch } from 'react-router';
import type { WithCreateDraft } from './library';
import * as MessageBox from '@components/message-box';

export const Drafts: React.FC<WithCreateDraft> = ({ onCreateDraft }) => {
  const history = useHistory();
  const match = useRouteMatch();
  const { isLoading, isError, isSuccess, error, data } = useDraftsList();

  async function handleDeleteDocument(version: string) {
    await deleteDraft(version);
  }

  if (isError) {
    return <p>Drafts ERROR</p>;
  }

  if (isLoading) {
    return <p>loading drafts...</p>;
  }

  return (
    <>
      {/* <Seo title="Drafts" /> */}
      {isSuccess && data?.length === 0 && (
        <MessageBox.Root>
          <MessageBox.Title>No Drafts available</MessageBox.Title>
          <MessageBox.Button onClick={onCreateDraft}>
            <span>Start your first document</span>
          </MessageBox.Button>
        </MessageBox.Root>
      )}

      <DocumentList
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data}
        onDeleteDocument={handleDeleteDocument}
      />
    </>
  );
};
