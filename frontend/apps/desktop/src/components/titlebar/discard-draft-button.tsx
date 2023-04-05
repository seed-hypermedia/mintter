import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {useDeleteDraftDialog} from '@components/delete-draft-dialog'
import '../../styles/titlebar.scss'

export default function DiscardDraftButton() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const draftId = route.key === 'draft' ? route.documentId : null
  const deleteModal = useDeleteDraftDialog(
    draftId,
    ({onClick}) => (
      <button className="titlebar-button outlined warning" onClick={onClick}>
        <span style={{marginInline: '0.2em'}}>Discard Draft</span>
      </button>
    ),
    () => {
      navigate({key: 'drafts'})
    },
  )
  if (route.key !== 'draft') return null
  return deleteModal
}
