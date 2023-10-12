import {useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {Button} from '@mintter/ui'
import {Check} from '@tamagui/lucide-icons'
import {useMediaDialog} from '../media-dialog'
import {useDaemonReady} from '../../node-status-context'
import {toast} from '../../toast'
import {useGRPCClient} from '../../app-context'
import {usePublishDraft} from '../../models/documents'

export default function CommitDraftButton() {
  const route = useNavRoute()
  if (route.key !== 'draft')
    throw new Error('DraftPublicationButtons requires draft route')
  const draftId = route.key == 'draft' ? route.draftId : null
  const navReplace = useNavigate('replace')
  const navBack = useNavigate('backplace')
  const grpcClient = useGRPCClient()

  const groupRouteContext =
    route.pubContext?.key === 'group' ? route.pubContext : null

  const mediaDialog = useMediaDialog()
  const isDaemonReady = useDaemonReady()
  const publish = usePublishDraft({
    onSuccess: ({pub: publishedDoc, pubContext}) => {
      if (!publishedDoc || !draftId) return
      if (
        route.contextRoute?.key === 'group' &&
        pubContext?.key === 'group' &&
        pubContext.pathName === '/'
      ) {
        navBack(route.contextRoute)
      } else {
        navReplace({
          key: 'publication',
          documentId: draftId,
          versionId: undefined, // hopefully this new version will match the latest version in the pubContext!
          pubContext: pubContext,
        })
      }
      toast.success('Document Committed.')
    },
    onError: (e: any) => {
      toast.error('Failed to publish: ' + e.message)
    },
  })

  if (route.key != 'draft' || !draftId) return null

  return (
    <>
      {mediaDialog.content}
      <Button
        size="$2"
        disabled={!isDaemonReady}
        onPress={() => {
          grpcClient.drafts.getDraft({documentId: draftId}).then((draft) => {
            const hasEmptyMedia = draft.children.find((block) => {
              return (
                block.block &&
                ['image', 'video', 'file'].includes(block.block.type) &&
                !block.block.ref
              )
            })
            if (hasEmptyMedia) {
              mediaDialog.open({
                draftId,
                publish,
              })
            } else {
              publish.mutate({draftId})
            }
          })
        }}
        theme="green"
        icon={Check}
      >
        {groupRouteContext ? 'Commit to Group' : 'Commit'}
      </Button>
    </>
  )
}
