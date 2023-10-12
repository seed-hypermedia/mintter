import {useDraftList} from '@mintter/app/models/documents'
import {DraftRoute} from '@mintter/app/utils/navigation'

import {useDeleteDraftDialog} from '@mintter/app/components/delete-draft-dialog'
import {EmptyList} from '@mintter/app/components/empty-list'
import Footer from '@mintter/app/components/footer'
import {useOpenDraft} from '@mintter/app/utils/open-draft'
import {Document} from '@mintter/shared'
import {
  Button,
  Container,
  MainWrapper,
  Spinner,
  Text,
  YStack,
} from '@mintter/ui'
import {X} from '@tamagui/lucide-icons'
import {GestureResponderEvent} from 'react-native'
import {useAppContext} from '../app-context'
import {ListItem} from '../components/list-item'
import {queryDraft} from '../models/documents'
import {useClickNavigate} from '../utils/useNavigate'

export default function DraftList() {
  let drafts = useDraftList()
  // TODO: add a `isFetching` indicator
  const openDraft = useOpenDraft('push')

  if (drafts.data) {
    return (
      <>
        <MainWrapper>
          <Container>
            {drafts.isInitialLoading ? (
              <Spinner />
            ) : drafts.data.documents.length ? (
              <YStack>
                {drafts.data.documents.map((draft) => (
                  <DraftListItem key={draft.id} draft={draft} />
                ))}
              </YStack>
            ) : (
              <EmptyList
                description="You have no current Drafts."
                action={() => {
                  openDraft()
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

  return <Spinner />
}

export function DraftListItem({draft}: {draft: Document}) {
  let title = draft.title || 'Untitled Document'
  const deleteDialog = useDeleteDraftDialog()
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
              deleteDialog.open({draftId: draft.id})
            },
          },
        ]}
      />
      {deleteDialog.content}
    </>
  )
}
