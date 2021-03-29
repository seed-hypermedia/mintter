import * as React from 'react';
// import Seo from 'components/seo'
import { DocumentList } from './document-list';
import { useDraftsList } from './mintter-hooks';
import { deleteDraft } from './mintter-client';
// import { Icons } from 'components/icons';
import { Button } from '@mintter/ui-legacy/button';
import { Separator } from '@mintter/ui-legacy/separator';
import { Text } from '@mintter/ui/text';
import { Box } from '@mintter/ui/box';
import { useHistory, useRouteMatch } from 'react-router';
import type { WithCreateDraft } from './library-page';
import { MessageBox } from './message-box';

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
        <MessageBox>
          <Text>No Drafts available</Text>
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
            <Text>Start your first document</Text>
          </Button>
        </MessageBox>
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
