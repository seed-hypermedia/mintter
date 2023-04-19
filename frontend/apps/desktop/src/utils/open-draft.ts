import {draftsClient} from '@app/api-clients'
import {queryKeys} from '@app/models/query-keys'
import {appInvalidateQueries} from '@app/query-client'
import {toast} from 'react-hot-toast'
import {Document} from '@mintter/shared'
import {useNavigate} from './navigation'

export function useOpenDraft() {
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  function openNewDraft(newWindow = true) {
    draftsClient
      .createDraft({})
      .then((doc: Document) => {
        appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
        if (newWindow) {
          spawn({key: 'draft', documentId: doc.id})
        } else {
          navigate({key: 'draft', documentId: doc.id})
        }
      })
      .catch(() => {
        toast.error('Failed to create new draft')
      })
  }
  return openNewDraft
}
