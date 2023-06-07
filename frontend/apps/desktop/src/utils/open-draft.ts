import {draftsClient} from '@app/api-clients'
import {queryKeys} from '@app/models/query-keys'
import {appInvalidateQueries} from '@app/query-client'
import {toast} from 'react-hot-toast'
import {DocumentChange} from '@mintter/shared'
import {DraftRoute, useNavigate, useNavRoute} from './navigation'

async function createDraft(siteHostname: string | undefined): Promise<string> {
  const doc = await draftsClient.createDraft({})
  if (siteHostname) {
    await draftsClient.updateDraftV2({
      documentId: doc.id,
      changes: [
        new DocumentChange({
          op: {case: 'setWebUrl', value: siteHostname},
        }),
      ],
    })
  }
  return doc.id
}

export function useOpenDraft() {
  const navigate = useNavigate()
  const route = useNavRoute()
  const contextDocumentId =
    route.key === 'publication' ? route.documentId : undefined
  const contextSiteHost = route.key === 'site' ? route.hostname : undefined
  const spawn = useNavigate('spawn')
  function openNewDraft(newWindow = true, hostname?: string | undefined) {
    createDraft(hostname)
      .then((docId: string) => {
        const draftRoute: DraftRoute = {
          key: 'draft',
          draftId: docId,
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
