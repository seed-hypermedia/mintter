import {useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  AlertCircle,
  Button,
  Popover,
  Separator,
  SizableText,
  Spinner,
  Tooltip,
  XGroup,
  XStack,
  YGroup,
  YStack,
  YStackProps,
} from '@mintter/ui'
import {Check, ChevronDown} from '@tamagui/lucide-icons'
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
  const publishableGroups = publishableGroupItems?.map((item) => {
    return {
      groupId: item.groupId,
      group: publishableGroupQueries.find((g) => g.data?.id === item.groupId)
        ?.data,
      path: item.path,
      isActive:
        !!groupVariant &&
        item.groupId === groupVariant.groupId &&
        item.path === groupVariant.pathName,
    }
  })
  const isAuthorVariant = !groupVariant
  function setVariant(variant: GroupVariant | null) {
    navReplace({...draftRoute, variant})
  }
  const publishDialogState = usePopoverState(false)
  const publishToGroupDialog = useAppDialog(GroupPublishDialog)
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
            backgroundColor={'transparent'}
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
                    <XStack>
                      {myAccount?.data?.profile?.alias}
                      <Check color={isAuthorVariant ? 'blue' : 'transparent'} />
                    </XStack>
                  </Button>
                </YGroup.Item>
              </YGroup>
              <SizableText>Publish to Group Variant</SizableText>
              <YGroup separator={<Separator />}>
                {publishableGroups?.map(({group, groupId, path, isActive}) => {
                  return (
                    <YGroup.Item key={`${groupId}-${path}`}>
                      <Button
                        onPress={() => {
                          setVariant({
                            key: 'group',
                            groupId,
                            pathName: path,
                          })
                        }}
                      >
                        <XStack>
                          <YStack>
                            <SizableText>{group?.title || groupId}</SizableText>
                            <SizableText>{path}</SizableText>
                          </YStack>
                          <Check color={isActive ? 'blue' : 'transparent'} />
                        </XStack>
                      </Button>
                    </YGroup.Item>
                  )
                })}
              </YGroup>
              <YStack padding="$2" alignSelf="stretch">
                <Button
                  onPress={() => {
                    publishToGroupDialog.open({})
                  }}
                >
                  Publish to Group
                </Button>
              </YStack>
            </YStack>
          </Popover.Content>
        </Popover>
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
