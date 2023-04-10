import {Dropdown} from '@app/editor/dropdown'
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
import {Document, formattedDate} from '@mintter/shared'
import {
  Text,
  Button,
  ButtonText,
  Container,
  Delete,
  ExternalLink,
  ListItem,
  MainWrapper,
  MoreHorizontal,
  Separator,
  XStack,
  YStack,
} from '@mintter/ui'
import {useQueryClient} from '@tanstack/react-query'
import Highlighter from 'react-highlight-words'
import {PageProps} from './base'

export default function DraftList(props: PageProps) {
  let {data, isInitialLoading} = useDraftList()
  // TODO: add a `isFetching` indicator
  const nav = useNavigationActions()
  return (
    <>
      <MainWrapper>
        <Container>
          {isInitialLoading ? (
            <p>loading...</p>
          ) : data && data.documents.length ? (
            <YStack tag="ul" padding={0}>
              {data.documents.map((draft) => (
                <DraftListItem key={draft.id} draft={draft} />
              ))}
            </YStack>
          ) : (
            <EmptyList
              description="You have no Drafts yet."
              action={() => {
                nav.openNewDraft(false)
              }}
            />
          )}
        </Container>
      </MainWrapper>
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
    <Button
      chromeless
      theme="gray"
      tag="li"
      onMouseEnter={() => prefetchDraft(client, draft)}
    >
      <ButtonText
        fontWeight="700"
        // @ts-ignore
        onPress={goToItem}
        flex={1}
        data-testid="list-item-title"
      >
        <Highlighter
          highlightClassName="search-highlight"
          searchWords={[search]}
          autoEscape={true}
          textToHighlight={title}
        />
      </ButtonText>
      <Text
        fontFamily="$body"
        fontSize="$2"
        data-testid="list-item-date"
        minWidth="10ch"
        textAlign="right"
      >
        {draft.updateTime ? formattedDate(draft.updateTime) : '...'}
      </Text>
      <XStack>
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <Button size="$1" circular data-trigger>
              <MoreHorizontal size={12} />
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              align="end"
              data-testid="library-item-dropdown-root"
            >
              <Dropdown.Item
                data-testid="new-window-item"
                onSelect={() => {
                  spawn({key: 'draft', documentId: draft.id})
                }}
                asChild
              >
                <ListItem
                  icon={ExternalLink}
                  size="$2"
                  hoverTheme
                  pressTheme
                  paddingVertical="$2"
                  paddingHorizontal="$4"
                  textAlign="left"
                  space="$0"
                >
                  Open in new Window
                </ListItem>
              </Dropdown.Item>
              {useDeleteDraftDialog(draft.id, ({onClick}) => {
                return (
                  <>
                    <Separator />
                    <Dropdown.Item
                      data-testid="delete-item"
                      onSelect={(e) => {
                        e.preventDefault()
                        onClick()
                      }}
                      asChild
                    >
                      <ListItem
                        icon={Delete}
                        size="$2"
                        hoverTheme
                        pressTheme
                        paddingVertical="$2"
                        paddingHorizontal="$4"
                        textAlign="left"
                        space="$0"
                      >
                        Delete Draft
                      </ListItem>
                    </Dropdown.Item>
                  </>
                )
              })}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </XStack>
    </Button>
  )
}
