import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {useDeleteDraftDialog} from '@components/delete-draft-dialog'
import {Button} from '@mintter/ui'

export default function DiscardDraftButton() {
  const route = useNavRoute()
  const backplace = useNavigate('backplace')
  const draftId = route.key === 'draft' ? route.draftId : null
  const contextDocumentId =
    route.key === 'draft' ? route.contextDocumentId : null
  const deleteModal = useDeleteDraftDialog(
    draftId,
    ({onClick}) => (
      <Button size="$2" theme="yellow" onPress={onClick}>
        Discard Draft
      </Button>
    ),
    () => {
      if (contextDocumentId) {
        backplace({key: 'publication', documentId: contextDocumentId})
      } else {
        backplace({key: 'drafts'})
      }
    },
  )
  if (route.key !== 'draft') return null
  return deleteModal
}
