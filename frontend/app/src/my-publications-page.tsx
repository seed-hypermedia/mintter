import * as React from 'react';
// import Seo from 'components/seo'
import { useHistory, useRouteMatch } from 'react-router';
import { DocumentList } from './document-list';
import { useMyPublicationsList } from './mintter-hooks';
import { createDraft, deletePublication } from './mintter-client';
// import {ErrorMessage} from 'components/error-message'
// import {Icons} from 'components/icons'
import { getPath } from './routes';
import { Button } from '@mintter/ui/button';
import { Separator } from '@mintter/ui/separator';
import { Box } from '@mintter/ui/box';
import { Text } from '@mintter/ui/text';
import type { WithCreateDraft } from './library-page';
import { MessageBox } from './message-box';

type MyPublicationProps = {
  noSeo?: boolean;
  isPublic?: boolean;
};

export const MyPublications: React.FC<MyPublicationProps & WithCreateDraft> = ({
  noSeo = false,
  isPublic = false,
  onCreateDraft,
}) => {
  const history = useHistory();
  const match = useRouteMatch();
  const {
    isError,
    isLoading,
    isSuccess,
    error,
    data = [],
  } = useMyPublicationsList();

  async function handleDeleteDocument(version: string) {
    await deletePublication(version);
  }

  if (isLoading) {
    return <p>loading my publications...</p>;
  }

  if (isError) {
    return <p>ERROR</p>;
  }

  return (
    <>
      {/* {!noSeo && <Seo title="My Publications" />} */}
      {isSuccess && data?.length === 0 && (
        <MessageBox>
          <Text as="h2" size="5" css={{ fontWeight: '$3' }}>
            No Publications (yet)
          </Text>
          {!isPublic && (
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
          )}
        </MessageBox>
      )}
      <DocumentList
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data}
        onDeleteDocument={!isPublic ? handleDeleteDocument : undefined}
      />
    </>
  );
};
