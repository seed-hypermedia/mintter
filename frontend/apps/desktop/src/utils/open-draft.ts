import {useQueryInvalidator} from '@shm/desktop/src/app-context'
import {queryKeys} from '@shm/desktop/src/models/query-keys'
import {DocumentChange, GRPCClient} from '@shm/shared'
import {useGRPCClient} from '../app-context'
import appError from '../errors'
import {NavMode, useNavRoute} from './navigation'
import {AccountRoute, DocumentRoute, DraftRoute} from './routes'
import {useNavigate} from './useNavigate'

export function useOpenDraft(navigateMode: NavMode = 'spawn') {
  const navigate = useNavigate(navigateMode)
  const route = useNavRoute()
  const invalidate = useQueryInvalidator()
  const grpcClient = useGRPCClient()
  function openNewDraft(opts?: {
    pathName?: string | null
    initialTitle?: string
    isProfileDocument?: boolean
  }) {
    createDraft(grpcClient, opts?.initialTitle)
      .then((docId: string) => {
        let contextRoute: undefined | DocumentRoute | AccountRoute = undefined
        if (route.key === 'document' || route.key === 'account') {
          contextRoute = route
        }
        const draftRoute: DraftRoute = {
          key: 'draft',
          draftId: docId,
          isProfileDocument: opts?.isProfileDocument,
          contextRoute,
        }
        invalidate([queryKeys.GET_DRAFT_LIST])
        invalidate([queryKeys.DOCUMENT_DRAFTS, docId])
        navigate(draftRoute)
      })
      .catch((err) => {
        appError('Error when creating draft from menu', {error: err})
      })
  }
  return openNewDraft
}

async function createDraft(
  grpcClient: GRPCClient,
  initialTitle?: string,
): Promise<string> {
  const doc = await grpcClient.drafts.createDraft({})
  if (initialTitle) {
    await grpcClient.drafts.updateDraft({
      documentId: doc.id,
      changes: [
        new DocumentChange({
          op: {case: 'setTitle', value: initialTitle},
        }),
      ],
    })
  }
  return doc.id
}
