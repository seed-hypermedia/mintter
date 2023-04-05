import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {useFind} from '@app/editor/find'
import {prefetchDraft, useDraftList} from '@app/hooks'
import {
  DraftRoute,
  useNavigate,
  useNavigationActions,
} from '@app/utils/navigation'
import {useDeleteDraftDialog} from '@components/delete-draft-dialog'
import {EmptyList} from '@components/empty-list'
import Footer from '@components/footer'
import {Icon} from '@components/icon'
import PageContainer from '@components/page-container'
import {Text} from '@components/text'
import {Document, formattedDate} from '@mintter/shared'
import {useQueryClient} from '@tanstack/react-query'
import Highlighter from 'react-highlight-words'
import '../styles/file-list.scss'
import {PageProps} from './base'

export default function DraftList(props: PageProps) {
  let {data, isInitialLoading} = useDraftList()
  // TODO: add a `isFetching` indicator
  const nav = useNavigationActions()
  return (
    <>
      <PageContainer>
        {isInitialLoading ? (
          <p>loading...</p>
        ) : data && data.documents.length ? (
          data.documents.map((draft) => (
            <DraftListItem key={draft.id} draft={draft} />
          ))
        ) : (
          <EmptyList
            description="You have no Drafts yet."
            action={() => {
              nav.openNewDraft(false)
            }}
          />
        )}
      </PageContainer>
      <Footer />
    </>
  )
}

export function DraftListItem({draft}: {draft: Document}) {
  let {search} = useFind()
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  let client = useQueryClient()
  let title = draft.title || 'Untitled Document'

  function goToItem(event: React.MouseEvent) {
    event.preventDefault()
    const route: DraftRoute = {key: 'draft', documentId: draft.id}
    if (event.metaKey || event.shiftKey) {
      spawn(route)
    } else {
      navigate(route)
    }
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
            >
              <Dropdown.Item
                data-testid="open-item"
                onSelect={(e) => {
                  //@ts-ignore
                  goToItem(e)
                }}
              >
                <Icon name="ArrowTopRight" />
                <Text size="2">Open</Text>
              </Dropdown.Item>
              <Dropdown.Item
                data-testid="new-window-item"
                onSelect={() => {
                  spawn({key: 'draft', documentId: draft.id})
                }}
              >
                <Icon name="OpenInNewWindow" />
                <Text size="2">Open in new Window</Text>
              </Dropdown.Item>
              {useDeleteDraftDialog(draft.id, ({onClick}) => {
                return (
                  <Dropdown.Item
                    data-testid="delete-item"
                    onSelect={(e) => {
                      e.preventDefault()
                      onClick()
                    }}
                  >
                    <Icon name="Close" />
                    <Text size="2">Delete Draft</Text>
                  </Dropdown.Item>
                )
              })}
              {/* <DeleteDialog
                deleteRef={deleteService}
                title="Delete draft"
                description="Are you sure you want to delete this draft? This action is not reversible."
              ></DeleteDialog> */}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </span>
    </li>
  )
}
