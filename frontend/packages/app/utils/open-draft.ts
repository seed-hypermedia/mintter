import {useQueryInvalidator} from '@mintter/app/app-context'
import {queryKeys} from '@mintter/app/models/query-keys'
import {DocumentChange, GRPCClient} from '@mintter/shared'
import {useGRPCClient} from '../app-context'
import appError from '../errors'
import {DraftRoute, GroupVariant, NavMode, useNavRoute} from './navigation'
import {useNavigate} from './useNavigate'

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
    groupVariant?: GroupVariant | undefined,
    opts?: {pathName?: string | null; initialTitle?: string},
  ) {
    // const destVariant: PublicationVariant =
    //   pubContext?.key === 'group'
    //     ? {
    //         ...pubContext,
    //         pathName: opts?.pathName || null,
    //       }
    //     : pubContext || null
    createDraft(grpcClient, opts?.initialTitle)
      .then((docId: string) => {
        const draftRoute: DraftRoute = {
          key: 'draft',
          draftId: docId,
          // variant: destVariant,
          contextRoute: route,
        }
        invalidate([queryKeys.GET_DRAFT_LIST])
        navigate(draftRoute)
      })
      .catch((err) => {
        appError('Error when creating draft from menu', {error: err})
      })
  }
  return openNewDraft
}
