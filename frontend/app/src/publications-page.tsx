import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router';
// import {Icons} from 'components/icons'
import { DocumentList } from './document-list';
import { getPath } from './routes';
import type { WithCreateDraft } from './library-page';
import { createDraft, deletePublication } from './mintter-client';
import { useOthersPublicationsList } from './mintter-hooks';
import type { Document } from '@mintter/api/documents/v1alpha/documents_pb';
import { Button } from '@mintter/ui-legacy/button';
import { Text } from '@mintter/ui-legacy/text';
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
          <Text as="h2" size="5" css={{ fontWeight: '$3' }}>
            No Publications (yet)
          </Text>
          <Button
            onClick={onCreateDraft}
            appearance="pill"
            variant="primary"
            css={{
              height: '$7',
              fontSize: '$3',
              marginTop: '$4',
              px: '$4',
            }}
          >
            {/* <Icons.FilePlus color="currentColor" /> */}
            <Text size="3" color="white">
              Start your first document
            </Text>
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
