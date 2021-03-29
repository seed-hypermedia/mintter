import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router';
// import {Icons} from 'components/icons'
import { DocumentList } from './document-list';
import type { WithCreateDraft } from './library-page';
import { createDraft, deletePublication } from './mintter-client';
import { useOthersPublicationsList } from './mintter-hooks';
import type { Document } from '@mintter/api/documents/v1alpha/documents_pb';
import { Button } from '@mintter/ui/button';
import { Text } from '@mintter/ui/text';
import { MessageBox } from './message-box';

export const Publications: React.FC<WithCreateDraft> = ({ onCreateDraft }) => {
  const history = useHistory();
  const match = useRouteMatch();

  const { isLoading, isError, error, data = [] } = useOthersPublicationsList();

  async function handleDeleteDocument(version: string) {
    await deletePublication(version);
  }

  if (isError) {
    return <p>feed ERROR</p>;
  }

  if (isLoading) {
    return <p>loading feed...</p>;
  }

  return (
    <>
      {/* <Seo title="Feed" /> */}
      {data?.length === 0 && (
        <MessageBox>
          <Text>No Publications (yet)</Text>
          <Button onClick={onCreateDraft} appearance="pill" color="primary">
            <Text>Start your first document</Text>
          </Button>
        </MessageBox>
      )}
      {/* TODO: fix data type */}
      <DocumentList
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data as any}
        onDeleteDocument={handleDeleteDocument}
      />
    </>
  );
};
