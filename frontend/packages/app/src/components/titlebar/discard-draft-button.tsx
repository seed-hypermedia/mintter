import {useDeleteDraftDialog} from '@mintter/app/src/components/delete-draft-dialog'
import {useNavRoute} from '@mintter/app/src/utils/navigation'
import {useNavigate} from '@mintter/app/src/utils/useNavigate'
import {Button, Tooltip} from '@mintter/ui'
import {Trash} from '@tamagui/lucide-icons'

export default function DiscardDraftButton() {
  const route = useNavRoute()
  const backplace = useNavigate('backplace')
  const draftId = route.key == 'draft' ? route.draftId : null

  const contextRoute = route.key == 'draft' ? route.contextRoute : null
  const deleteModal = useDeleteDraftDialog({
    id: draftId,
    trigger: ({onPress}) => (
      <Button size="$2" theme="orange" onPress={onPress} icon={Trash} />
    ),
    onSuccess: () => {
      if (contextRoute) {
        backplace(contextRoute)
      } else {
        backplace({key: 'drafts'})
      }
    },
  })
  if (route.key != 'draft') return null

  return <Tooltip content="Discard Draft">{deleteModal.deleteDialog}</Tooltip>
}
