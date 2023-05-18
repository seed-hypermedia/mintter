import {draftsClient} from '@app/api-clients'
import {queryKeys} from '@app/models/query-keys'
import {appInvalidateQueries} from '@app/query-client'
import {toast} from 'react-hot-toast'
import {Document} from '@mintter/shared'
import {DraftRoute, useNavigate, useNavRoute} from './navigation'

export function useOpenDraft() {
  const navigate = useNavigate()
  const route = useNavRoute()
  const contextDocumentId =
    route.key === 'publication' ? route.documentId : undefined
  const contextSiteHost = route.key === 'site' ? route.hostname : undefined
  const spawn = useNavigate('spawn')
  function openNewDraft(newWindow = true) {
    draftsClient
      .createDraft({})
      .then((doc: Document) => {
        const draftRoute: DraftRoute = {
          key: 'draft',
          draftId: doc.id,
          contextDocumentId,
          contextSiteHost,
        }
        appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
        if (newWindow) {
          spawn(draftRoute)
        } else {
          navigate(draftRoute)
        }
      })
      .catch(() => {
        toast.error('Failed to create new draft')
      })
  }
  return openNewDraft
}
