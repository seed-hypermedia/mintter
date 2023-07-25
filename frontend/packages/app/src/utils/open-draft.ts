import {queryKeys} from '@mintter/app/src/models/query-keys'
import {toast} from 'react-hot-toast'
import {DocumentChange, GRPCClient} from '@mintter/shared'
import {DraftRoute, useNavigate, useNavRoute} from './navigation'
import {useQueryInvalidator} from '@mintter/app/src/app-context'
import {useGRPCClient} from '../app-context'

async function createDraft(
  grpcClient: GRPCClient,
  siteHostname: string | undefined,
): Promise<string> {
  const doc = await grpcClient.drafts.createDraft({})
  if (siteHostname) {
    await grpcClient.drafts.updateDraft({
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
  const grpcClient = useGRPCClient()
  function openNewDraft(newWindow = true, hostname?: string | undefined) {
    createDraft(grpcClient, hostname)
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
