import {publicationsClient} from '@app/api-clients'
import {deleteFileMachine} from '@app/delete-machine'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {useFind} from '@app/editor/find'
import {prefetchPublication, queryKeys, useAuthor} from '@app/hooks'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {PublicationRoute, useNavigate} from '@app/utils/navigation'
import {
  formattedDate,
  MINTTER_LINK_PREFIX,
  Publication,
  Document,
} from '@mintter/shared'
import {useQueryClient} from '@tanstack/react-query'
import {useActor, useInterpret} from '@xstate/react'
import Highlighter from 'react-highlight-words'
import {toast} from 'react-hot-toast'
import {Button} from './button'
import {DeleteDialog} from './delete-dialog'
import {Icon} from './icon'
import {Text} from './text'

export function PublicationListItem({
  publication,
  hasDraft,
  copy = copyTextToClipboard,
}: {
  publication: Publication
  copy?: typeof copyTextToClipboard
  hasDraft: Document | undefined
}) {
  const {search} = useFind()
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  const client = useQueryClient()
  const title = publication.document?.title || 'Untitled Document'
  const {data: author} = useAuthor(publication.document?.author)
  const docId = publication.document?.id
  if (!docId) throw new Error('PublicationListItem requires id')

  const deleteService = useInterpret(
    () =>
      deleteFileMachine.withContext({
        documentId: publication.document?.id,
        version: publication.version,
        errorMessage: '',
      }),
    {
      services: {
        performDelete: (context) => {
          return publicationsClient.deletePublication({
            documentId: context.documentId,
          })
        },
      },
      actions: {
        persistDelete: () => {
          client.invalidateQueries([queryKeys.GET_PUBLICATION_LIST])
        },
      },
    },
  )
  const [deleteState] = useActor(deleteService)

  function goToItem(event: MouseEvent) {
    event.preventDefault()
    const route: PublicationRoute = {
      key: 'publication',
      documentId: docId,
      versionId: publication.version,
    }
    if (event.metaKey || event.shiftKey) {
      spawn(route)
    } else {
      navigate(route)
    }
  }

  function onCopy() {
    copy(
      `${MINTTER_LINK_PREFIX}${publication.document?.id}/${publication.version}`,
    )
    toast.success('Document ID copied successfully')
  }

  return (
    <li
      className="list-item"
      onMouseEnter={() => prefetchPublication(client, publication)}
    >
      <p
        onClick={goToItem}
        className="item-title"
        data-testid="list-item-title"
      >
        <Highlighter
          highlightClassName="search-highlight"
          searchWords={[search]}
          autoEscape={true}
          textToHighlight={title}
        />
        {hasDraft && (
          <Button
            variant="ghost"
            color="warning"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              navigate({key: 'draft', documentId: hasDraft.id})
            }}
            size="1"
            css={{
              border: '1px solid black',
              borderColor: '$warning-border-hover',
              color: '$warning-border-hover',
              paddingHorizontal: '$3',
              '&:hover': {
                color: 'white',
                background: '$warning-border-hover',
              },
            }}
          >
            Resume Editing
          </Button>
        )}
      </p>
      <Button
        variant="ghost"
        css={{
          '&:hover': {
            color: '$base-text-low',
            textDecoration: 'underline',
          },
        }}
        onClick={(e) => {
          const accountId = publication.document?.author
          if (!accountId) return
          e.preventDefault()
          e.stopPropagation()
          navigate({key: 'account', accountId})
        }}
        data-testid="list-item-author"
        className={`item-author ${
          !author?.profile?.alias ? 'loading' : undefined
        }`}
      >
        {author?.profile?.alias}
      </Button>
      <span
        onClick={goToItem}
        className="item-date"
        data-testid="list-item-date"
      >
        {publication.document?.updateTime
          ? formattedDate(publication.document?.updateTime)
          : '...'}
      </span>
      <span className="item-controls">
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <ElementDropdown
              data-trigger
              className="dropdown"
              css={{
                backgroundColor: 'transparent',
              }}
            >
              <Icon
                name="MoreHorizontal"
                color="muted"
                // className={match ? hoverIconStyle() : undefined}
              />
            </ElementDropdown>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              align="start"
              data-testid="library-item-dropdown-root"
              hidden={deleteState.matches('open')}
            >
              <Dropdown.Item data-testid="copy-item" onSelect={onCopy}>
                <Icon name="Copy" />
                <Text size="2">Copy Document ID</Text>
              </Dropdown.Item>
              <Dropdown.Item data-testid="open-item" onSelect={goToItem}>
                <Icon name="ArrowTopRight" />
                <Text size="2">Open in main panel</Text>
              </Dropdown.Item>
              <Dropdown.Item
                data-testid="new-window-item"
                onSelect={() =>
                  spawn({
                    key: 'publication',
                    documentId: docId,
                    versionId: publication.version,
                  })
                }
              >
                <Icon name="OpenInNewWindow" />
                <Text size="2">Open in new Window</Text>
              </Dropdown.Item>
              <DeleteDialog
                deleteRef={deleteService}
                title="Delete document"
                description="Are you sure you want to delete this document? This action is not reversible."
              >
                <Dropdown.Item
                  data-testid="delete-item"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Icon name="Close" />
                  <Text size="2">Delete Document</Text>
                </Dropdown.Item>
              </DeleteDialog>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </span>
    </li>
  )
}
