import {deletePublication, Publication} from '@mintter/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {deleteFileMachine} from '@app/delete-machine'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {useFind} from '@app/editor/find'
import {
  prefetchPublication,
  queryKeys,
  useAuthor,
  usePublicationList,
} from '@app/hooks'
import {useMain} from '@app/main-context'
import {formattedDate} from '@app/utils/get-format-date'
import {openWindow} from '@app/utils/open-window'
import {DeleteDialog} from '@components/delete-dialog'
import {EmptyList} from '@components/empty-list'
import {Icon} from '@components/icon'
import {useLocation} from '@components/router'
import {ScrollArea} from '@components/scroll-area'
import {Text} from '@components/text'
import {useQueryClient} from '@tanstack/react-query'
import {useActor, useInterpret} from '@xstate/react'
import copyTextToClipboard from 'copy-text-to-clipboard'
import Highlighter from 'react-highlight-words'
import toast from 'react-hot-toast'
import '../styles/file-list.scss'

export default PublicationList

function PublicationList() {
  let mainService = useMain()
  let {data, isInitialLoading} = usePublicationList()

  return (
    <div className="page-wrapper">
      <ScrollArea>
        {isInitialLoading ? (
          <p>loading...</p>
        ) : data && data.publications.length ? (
          <ul className="file-list" data-testid="files-list">
            {data.publications.map((publication) => (
              <PublicationListItem
                key={`${publication.document?.id}/${publication.version}`}
                publication={publication}
              />
            ))}
          </ul>
        ) : (
          <EmptyList
            description="You have no Publications yet."
            action={() => {
              // TODO: create a new draft
              mainService.send('COMMIT.NEW.DRAFT')
            }}
          />
        )}
      </ScrollArea>
    </div>
  )
}

export function PublicationListItem({
  publication,
  copy = copyTextToClipboard,
}: {
  publication: Publication
  copy?: typeof copyTextToClipboard
}) {
  const {search} = useFind()
  const [, setLocation] = useLocation()
  const client = useQueryClient()
  const title = publication.document?.title || 'Untitled Document'
  const {data: author} = useAuthor(publication.document?.author)
  const mainService = useMain()

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
          return deletePublication(context.documentId)
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
    if (event.metaKey || event.shiftKey) {
      openWindow(`/p/${publication.document?.id}/${publication.version}`)
    } else {
      setLocation(`/p/${publication.document?.id}/${publication.version}`)
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
      </p>
      <span
        onClick={goToItem}
        data-testid="list-item-author"
        className={`item-author ${
          !author?.profile?.alias ? 'loading' : undefined
        }`}
      >
        {author?.profile?.alias}
      </span>
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
                  mainService.send({
                    type: 'COMMIT.OPEN.WINDOW',
                    path: `/p/${publication.document.id}/${publication.version}`,
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
