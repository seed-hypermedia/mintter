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
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {X} from '@tamagui/lucide-icons'
import {useClickNavigate} from '../utils/navigation'
import {GestureResponderEvent} from 'react-native'
import {ListItem} from '../components/list-item'

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
  let title = draft.title || 'Untitled Document'
  const {deleteDialog, ...dialogState} = useDeleteDraftDialog({
    id: draft.id,
  })
  const navigate = useClickNavigate()
  const draftRoute: DraftRoute = {key: 'draft', draftId: draft.id}
  const goToItem = (e: GestureResponderEvent) => {
    navigate(draftRoute, e)
  }

  return (
    <>
      <ListItem
        title={title}
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
