import {useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {API_FILE_URL} from '@mintter/shared'
import {
  AlertCircle,
  Button,
  Popover,
  Separator,
  SizableText,
  Spinner,
  Tooltip,
  UIAvatar,
  XGroup,
  XStack,
  YStack,
  YStackProps,
} from '@mintter/ui'
import {Check, ChevronDown, Upload} from '@tamagui/lucide-icons'
import {PropsWithChildren, useEffect} from 'react'
import {useGRPCClient} from '../app-context'
import {useMyAccount} from '../models/accounts'
import {
  useDraftTitle,
  usePublishDraft,
  usePushPublication,
} from '../models/documents'
import {DraftStatusContext} from '../models/draft-machine'
import {useGatewayHost, usePushOnPublish} from '../models/gateway-settings'
import {
  useAccountGroups,
  useDocumentGroups,
  useGroup,
  useSelectedGroups,
} from '../models/groups'
import {useDaemonReady} from '../node-status-context'
import {toast} from '../toast'
import {usePopoverState} from '../use-popover-state'
import {AuthorsVariant, DraftRoute, GroupVariant} from '../utils/navigation'
import {useAppDialog} from './dialog'
import {useMediaDialog} from './media-dialog'
import {
  ContextPopover,
  ContextPopoverArrow,
  ContextPopoverContent,
  ContextPopoverTitle,
  GroupPublishDialog,
  GroupVariantItem,
} from './variants'

export default function CommitDraftButton() {
  const route = useNavRoute()
  if (route.key !== 'draft')
    throw new Error('DraftPublicationButtons requires draft route')
  const draftId = route.key == 'draft' ? route.draftId : null
  const draftRoute: DraftRoute = route
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
  const pushOnPublish = usePushOnPublish()
  const push = usePushPublication()
  const gwHost = useGatewayHost()
  const publish = usePublishDraft({
    onSuccess: ({pub: publishedDoc, groupVariant}) => {
      if (!publishedDoc || !draftId || !myAuthorVariant) return
      if (
        route.contextRoute?.key === 'group' &&
        groupVariant?.key === 'group' &&
        groupVariant.pathName === '/'
      ) {
        navBack(route.contextRoute)
      } else {
        navReplace({
          key: 'publication',
          documentId: draftId,
          versionId: undefined, // hopefully this new version will match the latest version in the pubContext!
          variant: groupVariant || myAuthorVariant,
          immediatelyPromptPush:
            pushOnPublish.data !== 'always' && pushOnPublish.data !== 'never',
          // showFirstPublicationMessage: isFirstPublish, // disabled until gateway publish works again for fresh installations
        })
      }
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
  const publishPopover = usePopoverState()
  const authorGroups = useAccountGroups(myAccount.data?.id)
  useEffect(() => {
    if (
      authorGroups.data?.items &&
      groupVariant &&
      !authorGroups.data.items.find((authorGroup) => {
        return authorGroup.group?.id === groupVariant.groupId
      })
    ) {
      navReplace({...draftRoute, variant: null})
    }
  }, [authorGroups.data?.items, groupVariant, draftRoute])
  const docGroups = useDocumentGroups(draftId || undefined)
  const authorGroupsSet = new Set(
    authorGroups.data?.items.map((g) => g.group?.id).filter(Boolean),
  )
  const publishableGroupItems = docGroups.data?.filter((docGroup) => {
    return authorGroupsSet.has(docGroup.groupId)
  })
  const publishableGroupQueries = useSelectedGroups(
    publishableGroupItems?.map((item) => item.groupId) || [],
  )
  let isPublishableGroupActiveVariant = false
  const publishableGroups = publishableGroupItems?.map((item) => {
    const isActive =
      !!groupVariant &&
      item.groupId === groupVariant.groupId &&
      item.path === groupVariant.pathName
    if (isActive) isPublishableGroupActiveVariant = true
    return {
      groupId: item.groupId,
      group: publishableGroupQueries.find((g) => g.data?.id === item.groupId)
        ?.data,
      path: item.path,
      isActive,
    }
  })
  const newGroupVariant = isPublishableGroupActiveVariant ? null : groupVariant
  const isAuthorVariant = !groupVariant
  function setVariant(variant: GroupVariant | null) {
    navReplace({...draftRoute, variant})
  }
  const publishToGroupDialog = useAppDialog(GroupPublishDialog, {})
  const draftTitle = useDraftTitle({documentId: draftId || undefined})
  if (route.key != 'draft' || !draftId) return null
  return (
    <>
      {mediaDialog.content}
      {publishToGroupDialog.content}
      <SaveIndicatorStatus />
      <XGroup separator={<Separator vertical />}>
        <XGroup.Item>
          {!hasUpdateError ? (
            <Button
              size="$2"
              disabled={!isDaemonReady || !canPublish || hasUpdateError}
              opacity={!canPublish ? 0.5 : 1}
              onPress={() => {
                grpcClient.drafts
                  .getDraft({documentId: draftId})
                  .then((draft) => {
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
                ? `Publish to ${group.data?.title || 'Group'}`
                : 'Publish'}
            </Button>
          ) : null}
        </XGroup.Item>
        <ContextPopover {...publishPopover}>
          {hasUpdateError ? null : (
            <XGroup.Item>
              <Popover.Trigger asChild>
                <Button theme="green" size="$2" icon={ChevronDown} />
              </Popover.Trigger>
            </XGroup.Item>
          )}

          <ContextPopoverContent>
            <ContextPopoverArrow />

            <YStack alignSelf="stretch">
              <ContextPopoverTitle>
                Publish to Author Variant
              </ContextPopoverTitle>
              <YStack gap="$2" padding="$2">
                <Button
                  padding="$2"
                  paddingHorizontal="$2"
                  size="$3"
                  backgroundColor="transparent"
                  onPress={() => {
                    setVariant(null)
                  }}
                >
                  <XStack jc="space-between" f={1} gap="$4" ai="center">
                    <XStack gap="$2" f={1} ai="center">
                      <UIAvatar
                        id={myAccount.data?.id || ''}
                        size={28}
                        url={
                          myAccount.data?.profile?.avatar &&
                          `${API_FILE_URL}/${myAccount.data?.profile?.avatar}`
                        }
                        label={
                          myAccount.data?.profile?.alias || myAccount.data?.id
                        }
                      />
                      <SizableText size="$3">
                        {myAccount?.data?.profile?.alias}
                      </SizableText>
                    </XStack>
                    <Check
                      size="$1"
                      color={isAuthorVariant ? '$blue11' : 'transparent'}
                    />
                  </XStack>
                </Button>
              </YStack>
              <ContextPopoverTitle>
                Publish to Group Variant
              </ContextPopoverTitle>
              <YStack gap="$2" padding="$2">
                {newGroupVariant ? (
                  <GroupVariantItem
                    isActive
                    groupId={newGroupVariant.groupId}
                    path={newGroupVariant.pathName || ''}
                  />
                ) : null}
                {publishableGroups?.map(({group, groupId, path, isActive}) => {
                  return (
                    <GroupVariantItem
                      key={`${groupId}-${path}`}
                      isActive={isActive}
                      path={path}
                      groupId={groupId}
                      onPress={() => {
                        if (isActive) return
                        setVariant({
                          key: 'group',
                          groupId,
                          pathName: path,
                        })
                      }}
                    />
                  )
                })}
              </YStack>
              <YStack padding="$2" alignSelf="stretch">
                <Button
                  onPress={() => {
                    publishPopover.onOpenChange(false)
                    publishToGroupDialog.open({
                      docId: draftId,
                      docTitle: draftTitle,
                      onComplete: () => {},
                    })
                  }}
                  icon={Upload}
                  size="$2"
                  chromeless
                >
                  Publish to Group...
                </Button>
              </YStack>
            </YStack>
          </ContextPopoverContent>
        </ContextPopover>
      </XGroup>
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
