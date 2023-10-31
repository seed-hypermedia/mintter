import {useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {Document, formattedDate, formattedDateMedium} from '@mintter/shared'
import {
  AlertCircle,
  Button,
  SizableText,
  Spinner,
  Tooltip,
  YStack,
  YStackProps,
} from '@mintter/ui'
import {Check} from '@tamagui/lucide-icons'
import {useGRPCClient} from '../app-context'
import {useDraft, usePublishDraft} from '../models/documents'
import {useDaemonReady} from '../node-status-context'
import {toast} from '../toast'
import {useMediaDialog} from './media-dialog'
import {DraftStatusContext} from '../models/draft-machine'
import {PropsWithChildren, useState} from 'react'

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
  const canPublish = DraftStatusContext.useSelector((s) => !s.matches('saving'))
  const hasUpdateError = DraftStatusContext.useSelector((s) =>
    s.matches('error'),
  )
  const publish = usePublishDraft({
    onSuccess: ({pub: publishedDoc, pubContext, isFirstPublish}) => {
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
          showFirstPublicationMessage: isFirstPublish,
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
          {groupRouteContext ? 'Commit to Group' : 'Commit'}
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
