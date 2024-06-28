import {NavMode, useNavRoute} from './navigation'
import {AccountRoute, DocumentRoute, DraftRoute} from './routes'
import {useNavigate} from './useNavigate'

export function useOpenDraft(navigateMode: NavMode = 'spawn') {
  const navigate = useNavigate(navigateMode)
  const route = useNavRoute()
  function openNewDraft(opts?: {id?: string; pathName?: string | null}) {
    let contextRoute: undefined | DocumentRoute | AccountRoute = undefined
    if (route.key === 'document' || route.key === 'account') {
      contextRoute = route
    }
    const draftRoute: DraftRoute = {
      key: 'draft',
      id: opts?.id || undefined,
      contextRoute,
    }
    // invalidate([queryKeys.GET_DRAFT_LIST])
    // invalidate([queryKeys.DOCUMENT_DRAFTS, draftId])
    navigate(draftRoute)
  }
  return openNewDraft
}
