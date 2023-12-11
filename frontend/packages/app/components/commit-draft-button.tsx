import {useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  AlertCircle,
  Button,
  Spinner,
  Tooltip,
  YStack,
  YStackProps,
} from '@mintter/ui'
import {Check} from '@tamagui/lucide-icons'
import {PropsWithChildren} from 'react'
import {useGRPCClient} from '../app-context'
import {useMyAccount} from '../models/accounts'
import {usePublishDraft} from '../models/documents'
import {DraftStatusContext} from '../models/draft-machine'
import {useGroup} from '../models/groups'
import {useDaemonReady} from '../node-status-context'
import {toast} from '../toast'
import {AuthorsVariant} from '../utils/navigation'
import {useMediaDialog} from './media-dialog'

export default function CommitDraftButton() {
  const route = useNavRoute()
  if (route.key !== 'draft')
    throw new Error('DraftPublicationButtons requires draft route')
  const draftId = route.key == 'draft' ? route.draftId : null

  const navReplace = useNavigate('replace')
  const navBack = useNavigate('backplace')
  const grpcClient = useGRPCClient()
  const myAccount = useMyAccount()
  const myAuthorVariant: AuthorsVariant | null = myAccount.data?.id
    ? {
        key: 'authors',
        authors: [myAccount.data.id],
      }
    : null
  const groupVariant = route.variant
  const group = useGroup(groupVariant?.groupId)

  const mediaDialog = useMediaDialog()
  const isDaemonReady = useDaemonReady()
  const canPublish = DraftStatusContext.useSelector(
    (s) => s.matches('idle') || s.matches('saved'),
  )
  const hasUpdateError = DraftStatusContext.useSelector((s) =>
    s.matches('error'),
  )
  const publish = usePublishDraft({
    onSuccess: ({pub: publishedDoc, groupVariant}) => {
      if (!publishedDoc || !draftId) return
      if (
        route.contextRoute?.key === 'group' &&
        groupVariant?.key === 'group' &&
        groupVariant.pathName === '/'
      ) {
        navBack(route.contextRoute)
      } else {
        console.log('HELLOOOO', groupVariant)
        navReplace({
          key: 'publication',
          documentId: draftId,
          versionId: undefined, // hopefully this new version will match the latest version in the pubContext!
          variant: groupVariant || myAuthorVariant,
          // showFirstPublicationMessage: isFirstPublish, // disabled until gateway publish works again for fresh installations
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
      <SaveIndicatorStatus />
      {!hasUpdateError ? (
        <Button
          size="$2"
          disabled={!isDaemonReady || !canPublish}
          opacity={!canPublish ? 0.5 : 1}
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
        >
          {groupVariant
            ? `Commit to ${group.data?.title || 'Group'}`
            : 'Commit'}
        </Button>
      ) : null}
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
        <Tooltip content="An error ocurred while trying to save the latest changes. please reload to make sure you do not loose any data.">
          <Button
            theme="red"
            size="$2"
            icon={<AlertCircle />}
            onPress={() => window.location.reload()}
          >
            Error
          </Button>
        </Tooltip>
      </StatusWrapper>
    )
  }

  return null
}
