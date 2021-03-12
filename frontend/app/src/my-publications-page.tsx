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

export function MyPublications({ noSeo = false, isPublic = false }) {
  const history = useHistory();
  const match = useRouteMatch();
  const {
    isError,
    isLoading,
    isSuccess,
    error,
    data,
  } = useMyPublicationsList();

  async function onCreateDocument() {
    const d = await createDraft();
    history.push({
      pathname: `${getPath(match)}/editor/${d.getId()}`,
    });
  }

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
        <>
          <Separator />
          <Box
            css={{
              bc: '$gray200',
              p: '$6',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: '$3',
              boxShadow:
                'inset 0 0 0 1px $colors$gray400, 0 0 0 1px $colors$gray400',
            }}
          >
            <h3 className="text-xl font-semibold text-primary">
              No Publications (yet)
            </h3>
            {!isPublic && (
              <Button
                onClick={() => onCreateDocument()}
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
                <span>Start your first document</span>
              </Button>
            )}
          </Box>
        </>
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
}
