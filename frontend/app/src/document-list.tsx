import type {Document, Publication} from '@mintter/client'
import {useMemo} from 'react'
import {useLocation} from 'react-router-dom'
import {Alert, Box, Text} from '@mintter/ui'
import {Link} from './components/link'
import {useMachine} from '@xstate/react'
import {deleteConfirmationDialogMachine} from './delete-confirmation-dialog'
import {useQueryClient} from 'react-query'
import {toast} from 'react-hot-toast'
import {getDateFormat} from './utils/get-format-date'

export function DocumentList({data, status, error}) {
  const location = useLocation()
  const isDraft = useMemo(() => location.pathname.includes('drafts'), [location.pathname])
  const toPrefix = useMemo(() => (isDraft ? '/editor' : '/p'), [isDraft])

  if (status == 'loading') {
    return <p>Loading...</p>
  }
  if (status == 'error') {
    console.error('DocumentList error: ', error)
    return <p>ERROR</p>
  }
  return (
    <Box as="ul" css={{padding: 0}}>
      {data.map((item: {document: Document} | Publication) => (
        <ListItem isDraft={isDraft} item={item} toPrefix={toPrefix} />
      ))}
    </Box>
  )
}

function ListItem({item, toPrefix, isDraft}: any) {
  const queryClient = useQueryClient()
  const [state, send] = useMachine(
    deleteConfirmationDialogMachine({
      onSuccess: () => {
        toast.success(`${isDraft ? 'Draft' : 'Publication'} deleted successfully`)
        queryClient.invalidateQueries(isDraft ? 'DraftList' : 'PublicationList')
      },
    }),
  )

  const {id, title, subtitle, author: itemAuthor} = item.document
  const theTitle = title ?? 'Untitled Document'

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
              id={item.document.id}
              open={state.matches('open')}
              onOpenChange={(value: boolean) =>
                value ? send({type: 'OPEN_DIALOG', payload: {entryId: item.document.id, isDraft}}) : send('CANCEL')
              }
            >
              <Alert.Trigger
                data-testid="delete-button"
                size="1"
                color="danger"
                onClick={(e: any) => {
                  e.preventDefault()
                  send({type: 'OPEN_DIALOG', payload: {entryId: item.document.id, isDraft}})
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
                      send('CONFIRM')
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
