import {queryKeys} from '@mintter/app/models/query-keys'
import {toast} from 'react-hot-toast'
import {DocumentChange, GRPCClient} from '@mintter/shared'
import {DraftRoute, NavMode, useNavRoute} from './navigation'
import {useNavigate} from './useNavigate'
import {useQueryInvalidator} from '@mintter/app/app-context'
import {useGRPCClient} from '../app-context'
import {PublicationRouteContext} from '@mintter/app/utils/navigation'

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

export function useOpenDraft(navigateMode: NavMode = 'spawn') {
  const navigate = useNavigate(navigateMode)
  const route = useNavRoute()
  const invalidate = useQueryInvalidator()
  const grpcClient = useGRPCClient()
  function openNewDraft(
    pubContext?: PublicationRouteContext | undefined,
    opts?: {pathName?: string | null; initialTitle?: string},
  ) {
    const destPubContext: PublicationRouteContext =
      pubContext?.key === 'group'
        ? {
            ...pubContext,
            pathName: opts?.pathName || null,
          }
        : pubContext || null
    createDraft(grpcClient, opts?.initialTitle)
      .then((docId: string) => {
        const draftRoute: DraftRoute = {
          key: 'draft',
          draftId: docId,
          pubContext: destPubContext,
          contextRoute: route,
        }
        invalidate([queryKeys.GET_DRAFT_LIST])
        navigate(draftRoute)
      })
      .catch((err) => {
        console.error(err)
        toast.error('Failed to create new draft')
      })
  }
  return openNewDraft
}
