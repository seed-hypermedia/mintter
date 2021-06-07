import { useHistory, useRouteMatch } from 'react-router';
import { DocumentList } from '../document-list';
import { deletePublication } from '@mintter/client';
import { useMyPublicationsList } from '@mintter/client/hooks'
import { Text } from '@mintter/ui';
import type { WithCreateDraft } from './library';
import * as MessageBox from '../components/message-box';

type MyPublicationProps = {
  noSeo?: boolean;
  isPublic?: boolean;
};

export const MyPublications = ({ isPublic = false, onCreateDraft }: MyPublicationProps & WithCreateDraft): JSX.Element => {
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
        <MessageBox.Root>
          <MessageBox.Title>No Publications (yet)</MessageBox.Title>
          {!isPublic && (
            <MessageBox.Button onClick={onCreateDraft}>
              {/* <Icons.FilePlus color="currentColor" /> */}
              <Text size="3">Start your first document</Text>
            </MessageBox.Button>
          )}
        </MessageBox.Root>
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
