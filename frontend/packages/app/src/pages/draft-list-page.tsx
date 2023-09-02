import {useDraftList} from '@mintter/app/src/models/documents'
import {usePopoverState} from '@mintter/app/src/use-popover-state'
import {DraftRoute, useNavigate} from '@mintter/app/src/utils/navigation'
import {useOpenDraft} from '@mintter/app/src/utils/open-draft'
import {useDeleteDraftDialog} from '@mintter/app/src/components/delete-draft-dialog'
import {Dropdown} from '@mintter/app/src/components/dropdown'
import {EmptyList} from '@mintter/app/src/components/empty-list'
import Footer from '@mintter/app/src/components/footer'
import {Document, formattedDate} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Container,
  ExternalLink,
  MainWrapper,
  MoreHorizontal,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {X} from '@tamagui/lucide-icons'
import {useClickNavigate} from '../utils/navigation'
import {GestureResponderEvent} from 'react-native'
import {ListItem} from '../components/list-item'
import {useAppContext} from '../app-context'
import {queryDraft} from '../models/documents'

export default function DraftList() {
  let drafts = useDraftList()
  // TODO: add a `isFetching` indicator
  const openDraft = useOpenDraft()

  if (drafts.data) {
    return (
      <>
        <MainWrapper>
          <Container>
            {drafts.isInitialLoading ? (
              <YStack padding="$6">
                <Spinner />
              </YStack>
            ) : drafts.data.documents.length ? (
              <YStack paddingVertical="$6">
                {drafts.data.documents.map((draft) => (
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

  if (drafts.error) {
    return (
      <MainWrapper>
        <Container>
          <YStack gap="$3" alignItems="flex-start" maxWidth={500} padding="$8">
            <Text fontFamily="$body" fontWeight="700" fontSize="$6">
              Drafts List Error
            </Text>
            <Text fontFamily="$body" fontSize="$4">
              {JSON.stringify(drafts.error)}
            </Text>
            <Button theme="yellow" onPress={() => drafts.refetch()}>
              try again
            </Button>
          </YStack>
        </Container>
      </MainWrapper>
    )
  }

  return (
    <YStack padding="$6">
      <Spinner />
    </YStack>
  )
}

export function DraftListItem({draft}: {draft: Document}) {
  let title = draft.title || 'Untitled Document'
  const {deleteDialog, ...dialogState} = useDeleteDraftDialog({
    id: draft.id,
  })
  const navigate = useClickNavigate()
  const {queryClient, grpcClient} = useAppContext()
  const draftRoute: DraftRoute = {key: 'draft', draftId: draft.id}
  const goToItem = (e: GestureResponderEvent) => {
    navigate(draftRoute, e)
  }

  return (
    <>
      <ListItem
        title={title}
        onPointerEnter={() => {
          queryClient.client.prefetchQuery(queryDraft(grpcClient, draft.id))
        }}
        onPress={goToItem}
        accessory={<></>}
        menuItems={[
          {
            label: 'Delete Draft',
            key: 'delete',
            icon: X,
            onPress: () => {
              dialogState.onOpenChange(true)
            },
          },
        ]}
      />
      {deleteDialog}
    </>
  )
}
