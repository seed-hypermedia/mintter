import {draftsClient} from '@app/api-clients'
import {queryKeys} from '@app/models/query-keys'
import {toast} from 'react-hot-toast'
import {DocumentChange} from '@mintter/shared'
import {DraftRoute, useNavigate, useNavRoute} from './navigation'
import {useQueryInvalidator} from '@mintter/app'

async function createDraft(siteHostname: string | undefined): Promise<string> {
  const doc = await draftsClient.createDraft({})
  if (siteHostname) {
    await draftsClient.updateDraft({
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
  const spawn = useNavigate('spawn')
  const invalidate = useQueryInvalidator()
  console.log('hello invalidate', invalidate)
  function openNewDraft(newWindow = true, hostname?: string | undefined) {
    createDraft(hostname)
      .then((docId: string) => {
        const draftRoute: DraftRoute = {
          key: 'draft',
          draftId: docId,
          contextRoute: route,
        }
        console.log('helloiiiiii')
        invalidate([queryKeys.GET_DRAFT_LIST])
        console.log('didinvalidate')
        if (newWindow) {
          console.log('newWindow')

          spawn(draftRoute)
        } else {
          console.log('navigate')
          navigate(draftRoute)
        }
      })
      .catch((err) => {
        console.error(err)
        toast.error('Failed to create new draft')
      })
  }
  return openNewDraft
}
