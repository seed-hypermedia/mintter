import {useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {BACKEND_FILE_URL, Group} from '@mintter/shared'
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
  YGroup,
  YStack,
  YStackProps,
} from '@mintter/ui'
import {Check, ChevronDown, Upload} from '@tamagui/lucide-icons'
import {PropsWithChildren} from 'react'
import {useGRPCClient} from '../app-context'
import {useMyAccount} from '../models/accounts'
import {useDraftTitle, usePublishDraft} from '../models/documents'
import {DraftStatusContext} from '../models/draft-machine'
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
import {GroupPublishDialog} from './variants'

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
  const publishPopover = usePopoverState()
  const authorGroups = useAccountGroups(myAccount.data?.id)
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
              disabled={!isDaemonReady || !canPublish}
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
        <Popover {...publishPopover} placement="bottom-end" allowFlip>
          <XGroup.Item>
            <Popover.Trigger asChild>
              <Button theme="green" size="$2" icon={ChevronDown} />
            </Popover.Trigger>
          </XGroup.Item>

          <Popover.Content
            borderWidth={1}
            // backgroundColor={'transparent'}
            borderColor="$borderColor"
            enterStyle={{y: -10, opacity: 0}}
            exitStyle={{y: -10, opacity: 0}}
            elevate
            animation={[
              'fast',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
          >
            <Popover.Arrow // why is this not working?
              borderWidth={1}
              borderColor="$borderColor"
              backgroundColor={'black'}
            />
            <YStack>
              <SizableText>Publish to Author Variant</SizableText>
              <YGroup>
                <YGroup.Item>
                  <Button
                    onPress={() => {
                      setVariant(null)
                    }}
                  >
                    <XStack jc="space-between" f={1}>
                      <XStack gap="$2">
                        <UIAvatar
                          id={myAccount.data?.id || ''}
                          size={20}
                          url={
                            myAccount.data?.profile?.avatar &&
                            `${BACKEND_FILE_URL}/${myAccount.data?.profile?.avatar}`
                          }
                          label={
                            myAccount.data?.profile?.alias || myAccount.data?.id
                          }
                        />
                        <SizableText>
                          {myAccount?.data?.profile?.alias}
                        </SizableText>
                      </XStack>
                      <Check color={isAuthorVariant ? 'blue' : 'transparent'} />
                    </XStack>
                  </Button>
                </YGroup.Item>
              </YGroup>
              <SizableText>Publish to Group Variant</SizableText>
              <YGroup separator={<Separator />}>
                {newGroupVariant ? (
                  <UnpublishedGroupPublicationItem variant={newGroupVariant} />
                ) : null}
                {publishableGroups?.map(({group, groupId, path, isActive}) => {
                  return (
                    <GroupPublicationItem
                      key={`${groupId}-${path}`}
                      isActive={isActive}
                      path={path}
                      groupId={groupId}
                      group={group}
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
              </YGroup>
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
          </Popover.Content>
        </Popover>
      </XGroup>
    </>
  )
}

function UnpublishedGroupPublicationItem({variant}: {variant: GroupVariant}) {
  const group = useGroup(variant.groupId)
  return (
    <GroupPublicationItem
      group={group.data}
      path={variant.pathName || undefined}
      groupId={variant.groupId}
      isActive={true}
    />
  )
}

function GroupPublicationItem({
  isActive,
  path,
  groupId,
  onPress,
  group,
}: {
  isActive?: boolean
  path?: string
  groupId?: string
  onPress?: () => void
  group: Group | undefined
}) {
  return (
    <YGroup.Item>
      <Button onPress={onPress}>
        <XStack f={1} jc="space-between" ai="center">
          <YStack>
            <SizableText>{group?.title || groupId}</SizableText>
            <SizableText fontSize="$2" color="$color10">
              {path}
            </SizableText>
          </YStack>
          <Check color={isActive ? 'blue' : 'transparent'} />
        </XStack>
      </Button>
    </YGroup.Item>
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
