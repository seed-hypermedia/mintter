import {useDraftList} from '@app/models/documents'
import {usePopoverState} from '@app/use-popover-state'
import {DraftRoute, useNavigate} from '@app/utils/navigation'
import {useOpenDraft} from '@app/utils/open-draft'
import {useDeleteDraftDialog} from '@components/delete-draft-dialog'
import {Dropdown} from '@components/dropdown'
import {EmptyList} from '@components/empty-list'
import Footer from '@components/footer'
import {Document, formattedDate} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Container,
  ExternalLink,
  MainWrapper,
  MoreHorizontal,
  Separator,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {X} from '@tamagui/lucide-icons'
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
  const popoverState = usePopoverState()
  const {deleteDialog, ...dialogState} = useDeleteDraftDialog({
    id: draft.id,
  })

  function goToItem(event: React.MouseEvent) {
    event.preventDefault()
    const route: DraftRoute = {key: 'draft', draftId: draft.id}
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
      // onPointerEnter={() => prefetchDraft(client, draft)}
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
        <Dropdown.Root {...popoverState}>
          <Dropdown.Trigger circular data-trigger icon={MoreHorizontal} />

          <Dropdown.Portal>
            <Dropdown.Content
              align="end"
              data-testid="library-item-dropdown-root"
            >
              <Dropdown.Item
                data-testid="new-window-item"
                onPress={() => {
                  spawn({key: 'draft', draftId: draft.id})
                }}
                asChild
                title="Open in new Window"
                icon={ExternalLink}
              />
              <Separator />
              <Dropdown.Item
                title="Delete Draft"
                icon={X}
                onPress={() => {
                  popoverState.onOpenChange(false)
                  dialogState.onOpenChange(true)
                }}
              />
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
        {deleteDialog}
      </XStack>
    </Button>
  )
}
