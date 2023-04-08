import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {useDeleteDraftDialog} from '@components/delete-draft-dialog'
import {Button} from '@mintter/ui'

export default function DiscardDraftButton() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const draftId = route.key === 'draft' ? route.documentId : null
  const deleteModal = useDeleteDraftDialog(
    draftId,
    ({onClick}) => (
      <Button size="$2" theme="yellow" onPress={onClick}>
        Discard Draft
      </Button>
    ),
    () => {
      navigate({key: 'drafts'})
    },
  )
  if (route.key !== 'draft') return null
  return deleteModal
}
