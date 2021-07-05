import {useMemo, useState} from 'react'
import {format} from 'date-fns'
import {useLocation, useRouteMatch} from 'react-router-dom'

import {Alert, Box, Text} from '@mintter/ui'

import {Avatar} from './components/avatar'
import {Link} from './components/link'

import {getPath} from './utils/routes'
import type {Publication, Document} from '@mintter/client'
import {useAccount} from '@mintter/client/hooks'

export function DocumentList({
  data,
  isLoading,
  isError,
  error,
  onDeleteDocument,
}: {
  // TODO: fix types
  // data: documents.Document.AsObject[];
  data: Array<Document>
  isLoading: boolean
  isError: boolean
  error: any
  onDeleteDocument?: (id: string) => Promise<void>
}) {
  if (isLoading) {
    return <p>Loading...</p>
  }
  if (isError) {
    return <p>ERROR</p>
  }
  return (
    <Box as="ul" css={{padding: 0}}>
      {data.map((item: Document) => (
        <ListItem key={item.id} item={item} onDeleteDocument={onDeleteDocument} />
      ))}
    </Box>
  )
}

function ListItem({
  item,
  onDeleteDocument,
}: {
  item: {document: Document; version?: string}
  onDeleteDocument?: (documentId: string) => void
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false)
  const {path} = useRouteMatch()
  const location = useLocation()
  // const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const {id, title, subtitle, author: itemAuthor} = item.document
  const theTitle = title ? title : 'Untitled Document'

  const isDraft = useMemo(() => location.pathname.includes('drafts'), [location.pathname])

  const to = useMemo(() => {
    return `${isDraft ? '/editor' : '/p'}/${id}`
  }, [location.pathname])

  const date = useMemo(() => item.createTime?.getDate() || new Date(), [item.createTime])

  return (
    <Box as="li" css={{position: 'relative', listStyle: 'none'}}>
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
          {/* {!isDraft && location.pathname !== '/library/my-publications' && (
            <>
              <Avatar css={{gridArea: 'avatar'}} />
              <Text size="1" css={{gridArea: 'author', alignSelf: 'center'}}>
                {account?.profile?.alias}
              </Text>{' '}
            </>
          )} */}
          <Box css={{gridArea: 'price'}}>
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
          <Box css={{gridArea: 'content'}}>
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
          <Box css={{gridArea: 'footer'}}>
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
              <Alert.Root open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <Alert.Trigger
                  data-testid="delete-button"
                  size="1"
                  color="danger"
                  onClick={(e: any) => {
                    e.preventDefault()
                    setIsDeleteDialogOpen(true)
                  }}
                >
                  trash
                </Alert.Trigger>
                <Alert.Content onClick={(e: any) => e.stopPropagation()}>
                  <Alert.Title color="danger">Delete document</Alert.Title>
                  <Alert.Description>
                    Are you sure you want to delete this document? This action is not reversible.
                  </Alert.Description>
                  <Alert.Actions>
                    <Alert.Cancel>Cancel</Alert.Cancel>
                    <Alert.Action
                      color="danger"
                      onClick={() => {
                        let deleteId = item.version ?? id
                        onDeleteDocument(deleteId)
                      }}
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
  )
}
