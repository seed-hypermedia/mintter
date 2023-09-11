import {queryKeys} from '@mintter/app/src/models/query-keys'
import {toast} from 'react-hot-toast'
import {DocumentChange, GRPCClient} from '@mintter/shared'
import {DraftRoute, useNavigate, useNavRoute} from './navigation'
import {useQueryInvalidator} from '@mintter/app/src/app-context'
import {useGRPCClient} from '../app-context'
import {PublicationRouteContext} from '@mintter/app/utils/navigation'

async function createDraft(
  grpcClient: GRPCClient,
  pubContext: PublicationRouteContext | undefined,
): Promise<string> {
  const doc = await grpcClient.drafts.createDraft({})
  // if (siteHostname) {
  //   await grpcClient.drafts.updateDraft({
  //     documentId: doc.id,
  //     changes: [
  //       new DocumentChange({
  //         op: {case: 'setWebUrl', value: siteHostname},
  //       }),
  //     ],
  //   })
  // }
  return doc.id
}

export function useOpenDraft() {
  const navigate = useNavigate()
  const route = useNavRoute()
  const spawn = useNavigate('spawn')
  const invalidate = useQueryInvalidator()
  const grpcClient = useGRPCClient()
  function openNewDraft(
    newWindow = true,
    pubContext?: PublicationRouteContext | undefined,
  ) {
    const destPubContext: PublicationRouteContext =
      pubContext?.key === 'group'
        ? {
            ...pubContext,
            pathName: null,
          }
        : pubContext || null
    createDraft(grpcClient, pubContext)
      .then((docId: string) => {
        const draftRoute: DraftRoute = {
          key: 'draft',
          draftId: docId,
          pubContext: destPubContext,
          contextRoute: route,
        }
        invalidate([queryKeys.GET_DRAFT_LIST])
        if (newWindow) {
          spawn(draftRoute)
        } else {
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
