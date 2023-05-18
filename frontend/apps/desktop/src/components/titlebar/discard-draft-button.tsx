import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {useDeleteDraftDialog} from '@components/delete-draft-dialog'
import {Tooltip} from '@components/tooltip'
import {Button} from '@mintter/ui'
import {Trash} from '@tamagui/lucide-icons'

export default function DiscardDraftButton() {
  const route = useNavRoute()
  const backplace = useNavigate('backplace')
  const draftId = route.key == 'draft' ? route.draftId : null

  const contextDocumentId =
    route.key == 'draft' ? route.contextDocumentId : null
  const deleteModal = useDeleteDraftDialog({
    id: draftId,
    trigger: ({onPress}) => (
      <Button size="$2" theme="orange" onPress={onPress} icon={Trash} />
    ),
    onSuccess: () => {
      if (contextDocumentId) {
        backplace({key: 'publication', documentId: contextDocumentId})
      } else {
        backplace({key: 'drafts'})
      }
    },
  })
  if (route.key != 'draft') return null

  return <Tooltip content="Discard Draft">{deleteModal.deleteDialog}</Tooltip>
}
