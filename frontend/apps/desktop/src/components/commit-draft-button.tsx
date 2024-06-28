import {useNavRoute} from '@/utils/navigation'
import {
  AlertCircle,
  Button,
  Spinner,
  Tooltip,
  YStack,
  YStackProps,
  toast,
} from '@shm/ui'
import {Check} from '@tamagui/lucide-icons'
import {PropsWithChildren} from 'react'
import {useGRPCClient} from '../app-context'
import {useMyAccount_deprecated} from '../models/accounts'
import {usePublishDraft, usePushPublication} from '../models/documents'
import {DraftStatusContext} from '../models/draft-machine'
import {useGatewayHost, usePushOnPublish} from '../models/gateway-settings'
import {useMediaDialog} from './media-dialog'

export default function CommitDraftButton() {
  const route = useNavRoute()
  const draftRoute = route.key === 'draft' ? route : null
  if (!draftRoute)
    throw new Error('DraftPublicationButtons requires draft route')
  const draftId = route.key == 'draft' ? route.draftId : null
  const grpcClient = useGRPCClient()
  const myAccount = useMyAccount_deprecated()
  const mediaDialog = useMediaDialog()
  const canPublish = DraftStatusContext.useSelector(
    (s) => s.matches('idle') || s.matches('saved'),
  )
  const hasUpdateError = DraftStatusContext.useSelector((s) =>
    s.matches('error'),
  )
  const pushOnPublish = usePushOnPublish()
  const push = usePushPublication()
  const gwHost = useGatewayHost()
  const publish = usePublishDraft({
    onSuccess: ({pub: publishedDoc}) => {
      if (!publishedDoc || !draftId) return
      if (pushOnPublish.data === 'always') {
        toast.promise(push.mutateAsync(draftId), {
          loading: `Document published. Pushing to ${gwHost}...`,
          success: `Document published to ${gwHost}`,
          error: (err) =>
            `Document published. Failed to push to ${gwHost}: ${err.message}`,
        })
      } else if (pushOnPublish.data === 'never') {
        toast.success('Document Committed.')
      } else {
        // ask
        toast.success('Document Committed...')
      }
    },
    onError: (e: any) => {
      toast.error('Failed to publish: ' + e.message)
    },
  })
  if (route.key != 'draft') return null
  const isProfileDoc = !!draftRoute?.isProfileDocument
  let publishMessage = 'Publish'
  if (isProfileDoc) {
    publishMessage = 'Publish to Profile'
  }
  return (
    <>
      {mediaDialog.content}
      <SaveIndicatorStatus />
      {hasUpdateError ? null : (
        <Button
          size="$2"
          disabled={!canPublish || hasUpdateError}
          opacity={!canPublish ? 0.5 : 1}
          onPress={() => {
            grpcClient.drafts.getDraft({draftId}).then((draft) => {
              const hasEmptyMedia = draft.document?.content.find((block) => {
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
        >
          {publishMessage}
        </Button>
      )}
    </>
  )
}

function StatusWrapper({children, ...props}: PropsWithChildren<YStackProps>) {
  return (
    <YStack space="$2" opacity={0.6}>
      {children}
    </YStack>
  )
}

function SaveIndicatorStatus() {
  const state = DraftStatusContext.useSelector((s) => s)

  if (state.matches('saving')) {
    return (
      <StatusWrapper>
        <Button chromeless size="$1" icon={<Spinner />}>
          saving...
        </Button>
      </StatusWrapper>
    )
  }

  if (state.matches('saved')) {
    return (
      <StatusWrapper>
        <Button chromeless size="$1" icon={<Check />} disabled>
          saved
        </Button>
      </StatusWrapper>
    )
  }

  if (state.matches('error')) {
    return (
      <StatusWrapper alignItems="flex-end">
        <Tooltip content="An error ocurred while trying to save the latest changes.">
          <Button theme="red" size="$2" icon={<AlertCircle />} disabled>
            Error
          </Button>
        </Tooltip>
      </StatusWrapper>
    )
  }

  return null
}
