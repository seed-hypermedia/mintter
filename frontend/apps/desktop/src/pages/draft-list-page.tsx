import {Dropdown} from '@app/editor/dropdown'
import {prefetchDraft, useDraftList} from '@app/models/documents'
import {DraftRoute, useNavigate} from '@app/utils/navigation'
import {useOpenDraft} from '@app/utils/open-draft'
import {useDeleteDraftDialog} from '@components/delete-draft-dialog'
import {EmptyList} from '@components/empty-list'
import Footer from '@components/footer'
import {Document, formattedDate} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Container,
  Delete,
  ExternalLink,
  ListItem,
  MainWrapper,
  MoreHorizontal,
  Separator,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {useQueryClient} from '@tanstack/react-query'

export default function DraftList() {
  let {data, isInitialLoading} = useDraftList()
  // TODO: add a `isFetching` indicator
  const openDraft = useOpenDraft()
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
                openDraft(false)
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
        {title}
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
