import {useMemo, useState} from 'react'
import {format} from 'date-fns'
import {useLocation, useRouteMatch} from 'react-router-dom'
import {Alert, Box, Text} from '@mintter/ui'
import {Avatar} from './components/avatar'
import {Link} from './components/link'
import {getPath} from './utils/routes'
import {Publication, Document, deleteDraft, deletePublication} from '@mintter/client'
import {useAccount} from '@mintter/client/hooks'
import {useMachine} from '@xstate/react'
import {deleteConfirmationDialogMachine, DeleteConfirmationDialogMachineContext} from './delete-confirmation-dialog'
import {useQueryClient} from 'react-query'
import {toast} from 'react-hot-toast'
import {getDateFormat} from './utils/get-format-date'
import {useCallback} from 'react'

export function DocumentList({
  data,
  status,
  error,
}: {
  // TODO: fix types
  // data: documents.Document.AsObject[];
  data: Array<Document>
  status: string
  error: any
}) {
  const queryClient = useQueryClient()
  const location = useLocation()
  const isDraft = useMemo(() => location.pathname.includes('drafts'), [location.pathname])
  const toPrefix = useMemo(() => (isDraft ? '/editor' : '/p'), [isDraft])
  const deleteMachine = useMachine(
    deleteConfirmationDialogMachine({onSuccess: onDeleteSuccess, executeAction: onDelete}),
  )

  function onDeleteSuccess() {
    toast.success(`${isDraft ? 'Draft' : 'Publication'} deleted successfully`)
    queryClient.invalidateQueries(isDraft ? 'DraftList' : 'PublicationList')
  }

  function onDelete(context: DeleteConfirmationDialogMachineContext, event: DeleteConfirmationDialogMachineEvent) {
    console.log('DELETE!', {isDraft, context, event})
    if (isDraft) return deleteDraft(event.entryId)
    return deletePublication(event.entryId)
  }
  if (status === 'loading') {
    return <p>Loading...</p>
  }
  if (status === 'error') {
    console.error('DocumentList error: ', error)
    return <p>ERROR</p>
  }
  return (
    <Box as="ul" css={{padding: 0}}>
      {data.map((item: Document) => (
        <ListItem key={item.id} item={item} deleteMachine={deleteMachine} toPrefix={toPrefix} />
      ))}
    </Box>
  )
}

function ListItem({item, deleteMachine, toPrefix}: {item: {document: Document; version?: string}; deleteMachine: any}) {
  const match = useRouteMatch()
  console.log('🚀 ~ file: document-list.tsx ~ line 64 ~ ListItem ~ match', match)
  const [deleteModal, deleteModalSend] = deleteMachine

  const {id, title, subtitle, author: itemAuthor} = item.document
  const theTitle = title ? title : 'Untitled Document'

  return (
    <Box as="li" css={{position: 'relative', listStyle: 'none'}}>
      <Box
        // TODO: fix types
        // @ts-ignore
        as={Link}
        to={`${toPrefix}/${id}`}
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
              {getDateFormat(item.document, 'createTime')}
            </Text>
          </Box>

          <Box
            css={{
              gridArea: 'icon',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Alert.Root
              open={deleteModal.matches('open')}
              onOpenChange={(value) => (value ? deleteModalSend('OPEN_DIALOG') : deleteModalSend('CANCEL'))}
            >
              <Alert.Trigger
                data-testid="delete-button"
                size="1"
                color="danger"
                onClick={(e: any) => {
                  e.preventDefault()
                  deleteModalSend('OPEN_DIALOG')
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
                      deleteModalSend({type: 'CONFIRM', entryId: item.version ?? id})
                    }}
                  >
                    Delete
                  </Alert.Action>
                </Alert.Actions>
              </Alert.Content>
            </Alert.Root>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
