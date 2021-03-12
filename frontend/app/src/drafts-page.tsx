import * as React from 'react';
// import Seo from 'components/seo'
import { DocumentList } from './document-list';
import { useDraftsList } from './mintter-hooks';
import { createDraft, deleteDraft } from './mintter-client';
import { getPath } from './routes';
// import { Icons } from 'components/icons';
import { Button } from '@mintter/ui/button';
import { Separator } from '@mintter/ui/separator';
import { Text } from '@mintter/ui/text';
import { Box } from '@mintter/ui/box';
import { useHistory, useRouteMatch } from 'react-router';

export function Drafts() {
  const history = useHistory();
  const match = useRouteMatch();
  const { isLoading, isError, isSuccess, error, data } = useDraftsList();

  async function onCreateDocument() {
    const d = await createDraft();
    history.push({
      pathname: `${getPath(match)}/editor/${d.getId()}`,
    });
  }

  async function handleDeleteDocument(version: string) {
    await deleteDraft(version);
  }

  if (isLoading) {
    <p>loading drafts...</p>;
  }

  return (
    <>
      {/* <Seo title="Drafts" /> */}
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
              No Drafts available
            </h3>
            {/* <p className="text-body font-light mt-5">
                Some clain sentence that's fun, welcomes user to the community
                and tells how it works and encourages to get started
              </p> */}
            <Button
              onClick={onCreateDocument}
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
          </Box>
        </>
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
}
