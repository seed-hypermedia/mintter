import {useDeleteDraftDialog} from '@/components/delete-draft-dialog'
import {useNavRoute} from '@/utils/navigation'
import {Button, Tooltip} from '@shm/ui'
import {Trash} from '@tamagui/lucide-icons'
import {useNavigationDispatch} from '../utils/navigation'

export default function DiscardDraftButton() {
  const route = useNavRoute()
  const dispatch = useNavigationDispatch()
  const draftId = route.key == 'draft' ? route.draftId : null
  const deleteDialog = useDeleteDraftDialog()
  if (route.key != 'draft' || !draftId) return null
  return (
    <>
      {deleteDialog.content}
      <Tooltip content="Discard Draft">
        <Button
          size="$2"
          theme="orange"
          onPress={() =>
            deleteDialog.open({
              draftId,
              onSuccess: () => {
                dispatch({type: 'closeBack'})
              },
            })
          }
          icon={Trash}
        />
      </Tooltip>
    </>
  )
}
