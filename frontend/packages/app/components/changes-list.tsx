import {useAccount} from '@mintter/app/models/accounts'
import {TimelineChange, useEntityTimeline} from '@mintter/app/models/changes'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  Change,
  createPublicWebHmUrl,
  formattedDateLong,
  pluralS,
  unpackHmId,
} from '@mintter/shared'
import {UnpackedHypermediaId} from '@mintter/shared/src/utils/entity-id-url'
import {
  Button,
  Copy,
  DialogDescription,
  DialogTitle,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from '@mintter/ui'
import {ArrowUpRight, Upload} from '@tamagui/lucide-icons'
import {createContext, useContext, useMemo} from 'react'
import {copyTextToClipboard} from '../copy-to-clipboard'
import {
  useGroup,
  useGroupContent,
  useMyGroups,
  usePublishDocToGroup,
} from '../models/groups'
import {toast} from '../toast'
import {
  GroupPublicationRouteContext,
  NavRoute,
  unpackHmIdWithAppRoute,
  useNavRoute,
} from '../utils/navigation'
import {AccessoryContainer} from './accessory-sidebar'
import {AccountLinkAvatar} from './account-link-avatar'
import {useAppDialog} from './dialog'
import {MenuItemType, OptionsDropdown} from './options-dropdown'

type ComputedChangeset = {
  activeVersionChanges: TimelineChange[]
  prevChanges: TimelineChange[]
  nextChanges: TimelineChange[]
}

function ChangeItem({
  change,
  prevListedChange,
  entityId,
  activeVersion,
}: {
  change: Change
  prevListedChange?: TimelineChange
  entityId: string
  activeVersion?: string
}) {
  const author = useAccount(change.author)
  const navigate = useNavigate()
  const openAccount = () => {
    navigate({key: 'account', accountId: change.author})
  }
  const navRoute = useNavRoute()
  const isActive = activeVersion === change.id
  const shouldDisplayAuthorName =
    !prevListedChange || change.author !== prevListedChange.change.author
  const changeTimeText = (
    <SizableText
      size="$2"
      textAlign="left"
      fontWeight={isActive ? 'bold' : 'normal'}
    >
      {change.createTime ? formattedDateLong(change.createTime) : null}
    </SizableText>
  )
  const topRow = shouldDisplayAuthorName ? (
    <XStack>
      <Button
        size="$2"
        alignItems="center"
        justifyContent="flex-start"
        chromeless
        onPress={openAccount}
        icon={<AccountLinkAvatar accountId={author?.data?.id} size={20} />}
      >
        {author?.data?.profile?.alias || change.author}
      </Button>
    </XStack>
  ) : (
    <XStack paddingLeft={35}>{changeTimeText}</XStack>
  )
  const dateRow = shouldDisplayAuthorName ? changeTimeText : null
  let destRoute: NavRoute | null = null
  if (navRoute.key === 'group') {
    destRoute = {
      key: 'group',
      groupId: entityId,
      version: change.id,
      accessory: {key: 'versions'},
    }
  } else if (navRoute.key === 'publication') {
    destRoute = {
      key: 'publication',
      documentId: entityId,
      versionId: change.id,
      pubContext: navRoute.pubContext,
      accessory: {key: 'versions'},
    }
  }
  const parsedEntityId = unpackHmId(entityId)
  const publicWebUrl =
    parsedEntityId &&
    createPublicWebHmUrl(parsedEntityId?.type, parsedEntityId?.eid, {
      version: change.id,
    })
  const spawn = useNavigate('spawn')
  const postToGroup = useContext(PostToGroup)
  const menuItems: MenuItemType[] = []
  if (postToGroup && activeVersion !== change.id) {
    menuItems.push({
      key: 'postToGroup',
      label: 'Post Version to Group',
      icon: Upload,
      onPress: () => {
        postToGroup(change.id)
      },
    })
  }
  if (publicWebUrl) {
    menuItems.push({
      key: 'copyLink',
      icon: Copy,
      onPress: () => {
        copyTextToClipboard(publicWebUrl)
      },
      label: 'Copy Link to Version',
    })
  }
  const newWindowRouteWUrl = publicWebUrl
    ? unpackHmIdWithAppRoute(publicWebUrl)
    : undefined
  const newWindowRoute = newWindowRouteWUrl?.navRoute
  if (newWindowRoute) {
    menuItems.push({
      key: 'openNewWindow',
      icon: ArrowUpRight,
      onPress: () => {
        spawn(newWindowRoute)
      },
      label: 'Open in New Window',
    })
  }
  return (
    <XStack
      marginTop={shouldDisplayAuthorName ? '$4' : undefined}
      ai="center"
      gap="$2"
      group="item"
    >
      <YStack
        f={1}
        overflow="hidden"
        borderRadius="$2"
        backgroundColor={isActive ? '$backgroundHover' : 'transparent'}
        hoverStyle={{
          cursor: 'pointer',
          backgroundColor: isActive ? '$green4' : '$backgroundHover',
        }}
        onPress={() => {
          destRoute && navigate(destRoute)
        }}
        disabled={!destRoute}
        paddingHorizontal="$4"
        position="relative"
      >
        {topRow}

        {dateRow && (
          <XStack gap="$2">
            <XStack width={28} />
            {dateRow}
          </XStack>
        )}
      </YStack>
      <OptionsDropdown hiddenUntilItemHover menuItems={menuItems} />
    </XStack>
  )
}

function PrevChangesList({
  changeset: {prevChanges},
  id,
  activeVersion,
}: {
  changeset: ComputedChangeset
  id: UnpackedHypermediaId
  activeVersion: string
}) {
  if (!prevChanges.length) return null
  return (
    <>
      <XStack paddingHorizontal="$4" paddingVertical="$3">
        <SizableText>Previous Versions</SizableText>
      </XStack>
      <YStack
        paddingHorizontal="$4"
        paddingBottom="$6"
        borderBottomColor="$borderColor"
        borderBottomWidth={1}
      >
        {prevChanges.map((item, index) => {
          return (
            <ChangeItem
              prevListedChange={prevChanges[index - 1]}
              entityId={id.id}
              key={item.change.id}
              change={item.change}
              activeVersion={activeVersion}
            />
          )
        })}
      </YStack>
    </>
  )
}

function ActiveChangesList({
  changeset: {activeVersionChanges, nextChanges, prevChanges},
  id,
  activeVersion,
}: {
  changeset: ComputedChangeset
  id: UnpackedHypermediaId
  activeVersion: string
}) {
  let subheading = prevChanges.length === 0 ? 'Original Version' : null
  if (!subheading) {
    subheading =
      activeVersionChanges.length > 1 ? 'Selected Versions' : 'Selected Version'
  }
  return (
    <>
      <XStack paddingHorizontal="$4" paddingVertical="$3">
        <SizableText>{subheading}</SizableText>
      </XStack>
      <YStack
        paddingHorizontal="$4"
        paddingBottom="$6"
        borderBottomColor="$borderColor"
        borderBottomWidth={1}
      >
        {activeVersionChanges.map((item, index) => {
          return (
            <ChangeItem
              prevListedChange={activeVersionChanges[index - 1]}
              entityId={id.id}
              key={item.change.id}
              change={item.change}
              activeVersion={activeVersion}
            />
          )
        })}
      </YStack>
    </>
  )
}

function NextChangesList({
  changeset: {nextChanges},
  id,
  activeVersion,
}: {
  changeset: ComputedChangeset
  id: UnpackedHypermediaId
  activeVersion: string
}) {
  if (!nextChanges.length) return null
  return (
    <>
      <XStack paddingHorizontal="$4" paddingVertical="$3">
        <SizableText>{pluralS(nextChanges.length, 'Next Version')}</SizableText>
      </XStack>
      <YStack
        paddingHorizontal="$4"
        paddingBottom="$6"
        borderBottomColor="$borderColor"
        borderBottomWidth={1}
      >
        {nextChanges.map((item, index) => {
          return (
            <ChangeItem
              prevListedChange={nextChanges[index - 1]}
              entityId={id.id}
              key={item.change.id}
              change={item.change}
              activeVersion={activeVersion}
            />
          )
        })}
      </YStack>
    </>
  )
}

function PostToGroupDialog({
  input,
  onClose,
}: {
  input: {
    groupPubContext: GroupPublicationRouteContext
    changeId: string
    docId: string
  }
  onClose: () => void
}) {
  const group = useGroup(input.groupPubContext.groupId)
  const groupContent = useGroupContent(input.groupPubContext.groupId)
  const publish = usePublishDocToGroup()
  const prevItem =
    input.groupPubContext.pathName &&
    groupContent.data?.content?.[input.groupPubContext.pathName]
  // const prevItemId = prevItem ? unpackHmId(prevItem) : null
  const navigate = useNavigate()
  return (
    <>
      <DialogTitle>Update &quot;{group.data?.title}&quot;</DialogTitle>
      <DialogDescription>
        Replace &quot;{input.groupPubContext?.pathName}
        &quot; with this version?
      </DialogDescription>
      <YStack gap="$1">
        <Button
          theme="green"
          iconAfter={publish.isLoading ? <Spinner /> : null}
          onPress={() => {
            if (!input.groupPubContext.pathName) {
              onClose()
              return
            }
            publish
              .mutateAsync({
                docId: input.docId,
                groupId: input.groupPubContext.groupId,
                pathName: input.groupPubContext.pathName,
                version: input.changeId,
              })
              .then(() => {
                onClose()
                navigate({
                  key: 'publication',
                  documentId: input.docId,
                  pubContext: input.groupPubContext,
                  accessory: {key: 'versions'},
                })
                toast.success('Group version updated')
              })
              .catch((e) => {
                console.error(e)
                toast.error('Something went wrong')
              })
          }}
        >
          Publish Version
        </Button>
        <Button
          chromeless
          size="$2"
          onPress={() => {
            onClose()
          }}
        >
          Cancel
        </Button>
      </YStack>
    </>
  )
}

function deduplicatedChanges(changes: TimelineChange[]): TimelineChange[] {
  const seenChanges = new Set<string>()
  const deduplicated: TimelineChange[] = []
  changes.forEach((ch) => {
    if (seenChanges.has(ch.change.id)) return
    seenChanges.add(ch.change.id)
    deduplicated.push(ch)
  })
  return deduplicated
}

export function EntityVersionsAccessory({
  id,
  activeVersion,
}: {
  id?: UnpackedHypermediaId | null
  activeVersion: string
}) {
  const {data} = useEntityTimeline(id?.id)
  const computed = useMemo(() => {
    const activeVersionChanges: TimelineChange[] = []
    activeVersion
      ?.split('.')
      .map((chId) => data?.allChanges[chId])
      .forEach((ch) => ch && activeVersionChanges.push(ch))
    const prevChanges: TimelineChange[] = []
    let walkLeafVersions = activeVersionChanges
    while (walkLeafVersions?.length) {
      const nextLeafVersions: TimelineChange[] = []
      for (const change of walkLeafVersions) {
        change?.change.deps?.map((depChangeId) => {
          const depChange = data?.allChanges[depChangeId]
          if (depChange) {
            prevChanges.push(depChange)
            nextLeafVersions.push(depChange)
          }
        })
      }
      walkLeafVersions = nextLeafVersions
    }
    const nextVersionChangeIds = new Set<string>()
    activeVersionChanges.forEach((ch) =>
      ch.citations.forEach((citingId) => nextVersionChangeIds.add(citingId)),
    )
    const nextVersionChanges = [...nextVersionChangeIds]
      .map((changeId) => data?.allChanges[changeId])
      .filter(Boolean) as TimelineChange[]
    return {
      activeVersionChanges,
      prevChanges: deduplicatedChanges(prevChanges),
      nextChanges: deduplicatedChanges(nextVersionChanges),
    }
  }, [data, activeVersion])
  const route = useNavRoute()
  const pubContext = route?.key === 'publication' ? route.pubContext : undefined
  const docId = route?.key === 'publication' ? route.documentId : undefined
  const groupPubContext = pubContext?.key === 'group' ? pubContext : null
  const myGroups = useMyGroups()
  const isInPostableContext =
    groupPubContext &&
    myGroups.data?.items?.find(
      (item) => item.group?.id === groupPubContext?.groupId,
    )
  const postToGroup = useAppDialog(PostToGroupDialog)
  if (!id) return null
  return (
    <>
      <AccessoryContainer title="Versions">
        <PostToGroup.Provider
          value={
            groupPubContext && docId && isInPostableContext
              ? (changeId) => {
                  postToGroup.open({groupPubContext, changeId, docId})
                }
              : null
          }
        >
          <NextChangesList
            changeset={computed}
            id={id}
            activeVersion={activeVersion}
          />
          <ActiveChangesList
            changeset={computed}
            id={id}
            activeVersion={activeVersion}
          />
          <PrevChangesList
            changeset={computed}
            id={id}
            activeVersion={activeVersion}
          />
        </PostToGroup.Provider>
      </AccessoryContainer>
      {postToGroup.content}
    </>
  )
}

const PostToGroup = createContext<null | ((changeId: string) => void)>(null)
