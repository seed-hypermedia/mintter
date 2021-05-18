import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { useLocation, useRouteMatch } from 'react-router-dom';

import type documents from '@mintter/api/documents/v1alpha/documents_pb';
import { Alert } from '@mintter/ui/alert';
import { Box } from '@mintter/ui/box';
import { Text } from '@mintter/ui/text';

import { Avatar } from '@components/avatar';
import { getPath } from '@utils/routes';

import { Link } from './components/link';

export function DocumentList({
  data,
  isLoading,
  isError,
  error,
  onDeleteDocument,
}: {
  // TODO: fix types
  // data: documents.Document.AsObject[];
  data: any;
  isLoading: boolean;
  isError: boolean;
  error: any;
  onDeleteDocument?: (id: string) => Promise<void>;
}) {
  if (isLoading) {
    return <p>Loading...</p>;
  }
  if (isError) {
    return <p>ERROR</p>;
  }

  return (
    <div>
      {/* // TODO: fix types */}
      {data.map((item: any) => (
        <ListItem
          key={item.id}
          item={item}
          onDeleteDocument={onDeleteDocument}
        />
      ))}
    </div>
  );
}

function ListItem({
  item,
  onDeleteDocument,
}: {
  item: {
    publication: documents.Publication;
    version: string;
    document?: documents.Document.AsObject;
  }; // TODO: fix types (Document.AsObject + Document)
  onDeleteDocument?: (version: string) => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  const match = useRouteMatch();
  const location = useLocation();
  // const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const { publication, version, document } = item;

  const {
    id,
    title,
    subtitle,
    author: itemAuthor,
  } = document as documents.Document.AsObject;

  const theTitle = title ? title : 'Untitled Document';


  const isDraft = useMemo(() => location.pathname.includes('drafts'), [
    location.pathname,
  ]);

  const to = useMemo(() => {
    const path = `${getPath(match)}${isDraft ? '/editor' : '/p'}/${id}${
      version ? `/${version}` : ''
    }`;
    return path;
  }, [location.pathname]);
  // function handlePrefetch() {
  // if (!prefetched) {
  // TODO: prefetch on hover
  // console.log(`prefetch draft with id ${draft.id}`)
  // setPrefetch(true)
  // }
  // }

  const date = useMemo(
    () => publication?.getDocument()?.getCreateTime()?.toDate() || new Date(),
    [publication],
  );

  return (
    <Box css={{ position: 'relative' }}>
      <Box
        // TODO: fix types
        // @ts-ignore
        as={Link}
        to={to}
        css={{
          padding: '$5',
          borderRadius: '$2',
          display: 'flex',
          gap: '$5',
          textDecoration: 'none',
          transition: 'background 0.25s ease-in-out',
          '&:hover': {
            backgroundColor: '$background-muted',
          },
        }}
      >
        <Box
          css={{
            flex: 'none',
            background: '$primary-muted',
            width: 220,
            height: 140,
          }}
        />
        <Box
          css={{
            flex: 1,
            display: 'grid',
            gridTemplateAreas: `"avatar author price"
        "content content icon"
        "footer footer footer"`,
            gridTemplateColumns: '24px 1fr auto',
            gridTemplateRows: '24px auto auto',
            gap: '$2',
          }}
        >
          {/* {!isDraft && location.pathname !== '/library/my-publications' && ( */}

          <Avatar css={{ gridArea: 'avatar' }} />
          {/* <Text size="1" css={{ gridArea: 'author', alignSelf: 'center' }}>
            {author?.username}
          </Text> */}
          <Box css={{ gridArea: 'price' }}>
            <Text
              size="1"
              css={{
                background: '$background-contrast-strong',
                paddingVertical: '$2',
                paddingHorizontal: '$3',
                borderRadius: '$1',
                display: 'inline-block',
              }}
              color="opposite"
            >
              0.09$
            </Text>
          </Box>
          <Box css={{ gridArea: 'content' }}>
            <Text
              size="7"
              // TODO: fix types
              // @ts-ignore
              color="default"
              css={{
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {theTitle}
            </Text>
            {subtitle && (
              <Text size="5" color="muted">
                {subtitle}
              </Text>
            )}
          </Box>
          <Box css={{ gridArea: 'footer' }}>
            <Text size="1" color="muted">
              {format(new Date(date), 'MMMM d, yyyy')}
            </Text>
          </Box>

          {onDeleteDocument && (
            <Box
              css={{
                gridArea: 'icon',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Alert.Root
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <Alert.Trigger
                  data-testid="delete-button"
                  size="1"
                  color="danger"
                  onClick={(e: any) => {
                    e.preventDefault();
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  trash
                </Alert.Trigger>
                <Alert.Content onClick={(e: any) => e.stopPropagation()}>
                  <Alert.Title color="danger">Delete document</Alert.Title>
                  <Alert.Description>
                    Are you sure you want to delete this document? This action
                    is not reversible.
                  </Alert.Description>
                  <Alert.Actions>
                    <Alert.Cancel>Cancel</Alert.Cancel>
                    <Alert.Action
                      color="danger"
                      onClick={() => onDeleteDocument(version)}
                    >
                      Delete
                    </Alert.Action>
                  </Alert.Actions>
                </Alert.Content>
              </Alert.Root>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
