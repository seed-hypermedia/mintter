import {deleteDraft, Document} from '@app/client'
import {deleteFileMachine} from '@app/delete-machine'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {useFind} from '@app/editor/find'
import {prefetchDraft, queryKeys, useDraftList} from '@app/hooks'
import {useMain} from '@app/main-context'
import {formattedDate} from '@app/utils/get-format-date'
import {DeleteDialog} from '@components/delete-dialog'
import {EmptyList} from '@components/empty-list'
import {Icon} from '@components/icon'
import {useLocation} from '@components/router'
import {ScrollArea} from '@components/scroll-area'
import {Text} from '@components/text'
import {useQueryClient} from '@tanstack/react-query'
import {useActor, useInterpret} from '@xstate/react'
import Highlighter from 'react-highlight-words'
import '../styles/file-list.scss'

export default DraftList

function DraftList() {
  let mainService = useMain()
  let {data, isInitialLoading} = useDraftList()
  // TODO: add a `isFetching` indicator
  return (
    <div className="page-wrapper">
      <ScrollArea>
        {isInitialLoading ? (
          <p>loading...</p>
        ) : data && data.documents.length ? (
          <ul className="file-list" data-testid="files-list">
            {data.documents.map((draft) => (
              <DraftListItem key={draft.id} draft={draft} />
            ))}
          </ul>
        ) : (
          <EmptyList
            description="You have no Drafts yet."
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

export function DraftListItem({draft}: {draft: Document}) {
  let {search} = useFind()
  let [, setLocation] = useLocation()
  let mainService = useMain()
  let client = useQueryClient()
  let title = draft.title || 'Untitled Document'

  const deleteService = useInterpret(
    () =>
      deleteFileMachine.withContext({
        documentId: draft.id,
        version: null,
        errorMessage: '',
      }),
    {
      services: {
        performDelete: (context) => {
          return deleteDraft(context.documentId)
        },
      },
      actions: {
        persistDelete: () => {
          client.invalidateQueries([queryKeys.GET_DRAFT_LIST])
        },
      },
    },
  )
  const [deleteState] = useActor(deleteService)

  function goToItem() {
    setLocation(`/d/${draft.id}`)
  }

  return (
    <li className="list-item" onMouseEnter={() => prefetchDraft(client, draft)}>
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
        className="item-date"
        data-testid="list-item-date"
      >
        {draft.updateTime ? formattedDate(draft.updateTime) : '...'}
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
              <Dropdown.Item data-testid="open-item" onSelect={goToItem}>
                <Icon name="ArrowTopRight" />
                <Text size="2">Open</Text>
              </Dropdown.Item>
              <Dropdown.Item
                data-testid="new-window-item"
                onSelect={() =>
                  mainService.send({
                    type: 'COMMIT.OPEN.WINDOW',
                    path: `/d/${draft.id}`,
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
