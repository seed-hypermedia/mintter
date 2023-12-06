import {useAccount} from '@mintter/app/models/accounts'
import {TimelineChange} from '@mintter/app/models/changes'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  Change,
  createPublicWebHmUrl,
  formattedDateLong,
  unpackHmId,
} from '@mintter/shared'
import {UnpackedHypermediaId} from '@mintter/shared/src/utils/entity-id-url'
import {
  Button,
  ButtonText,
  Copy,
  DialogDescription,
  DialogTitle,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from '@mintter/ui'
import {ArrowUpRight, Upload} from '@tamagui/lucide-icons'
import {createContext, useContext} from 'react'
import {copyTextToClipboard} from '../copy-to-clipboard'
import appError from '../errors'
import {useDocHistory} from '../models/changes'
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
  const openAccount = (e) => {
    e.stopPropagation()
    navigate({key: 'account', accountId: change.author})
  }
  const navRoute = useNavRoute()
  const isActive = new Set(activeVersion?.split('.') || []).has(change.id)
  const shouldDisplayAuthorName =
    !prevListedChange || change.author !== prevListedChange.change.author
  const changeTimeText = (
    <SizableText size="$2" textAlign="left">
      {change.createTime ? formattedDateLong(change.createTime) : null}
    </SizableText>
  )
  const topRow = shouldDisplayAuthorName ? (
    <XStack paddingTop="$2" gap="$2">
      <AccountLinkAvatar accountId={author?.data?.id} size={24} />
      <ButtonText
        onPress={openAccount}
        hoverStyle={{
          textDecorationLine: 'underline',
        }}
      >
        {author?.data?.profile?.alias || change.author}
      </ButtonText>
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
      variant: navRoute.variant,
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
      ai="center"
      gap="$2"
      group="item"
      borderRadius={'$2'}
      paddingHorizontal="$2"
      paddingVertical="$1"
      marginBottom="$1"
      backgroundColor={isActive ? '$blue5' : 'transparent'}
    >
      <YStack
        f={1}
        overflow="hidden"
        hoverStyle={{
          cursor: 'pointer',
        }}
        onPress={() => {
          destRoute && navigate(destRoute)
        }}
        disabled={!destRoute}
        padding="$1"
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
              .catch((error) => {
                appError(`Error when publishing to group: ${error?.message}`, {
                  error,
                })
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

export function EntityVersionsAccessory({
  id,
  activeVersion,
  variantVersion,
}: {
  id?: UnpackedHypermediaId | null
  activeVersion: string | undefined
  variantVersion: string | undefined
}) {
  const changes = useDocHistory(id?.id, variantVersion)
  const route = useNavRoute()
  const pubContext = route?.key === 'publication' ? route.variant : undefined
  const docId = route?.key === 'publication' ? route.documentId : undefined
  const groupVariant = pubContext?.key === 'group' ? pubContext : null
  const myGroups = useMyGroups()
  const isInPostableContext =
    groupVariant &&
    myGroups.data?.items?.find(
      (item) => item.group?.id === groupVariant?.groupId,
    )
  const postToGroup = useAppDialog(PostToGroupDialog)
  if (!id) return null
  return (
    <>
      <AccessoryContainer title="Variant History">
        <PostToGroup.Provider
          value={
            groupVariant && docId && isInPostableContext
              ? (changeId) => {
                  postToGroup.open({groupVariant, changeId, docId})
                }
              : null
          }
        >
          {/* <NextChangesList
            changeset={computed}
            id={id}
            activeVersion={activeVersion}
          /> */}
          {/* <ActiveChangesList
            changeset={computed}
            id={id}
            activeVersion={activeVersion}
          />
          <PrevChangesList
            changeset={computed}
            id={id}
            activeVersion={activeVersion}
          /> */}

          <YStack
            paddingHorizontal="$4"
            paddingVertical="$2"
            paddingBottom="$6"
            borderBottomColor="$borderColor"
            borderBottomWidth={1}
          >
            {changes.map((item, index) => {
              return (
                <ChangeItem
                  prevListedChange={changes[index - 1]}
                  entityId={id.id}
                  key={item.change.id}
                  change={item.change}
                  activeVersion={activeVersion}
                />
              )
            })}
          </YStack>
        </PostToGroup.Provider>
      </AccessoryContainer>
      {postToGroup.content}
    </>
  )
}

const PostToGroup = createContext<null | ((changeId: string) => void)>(null)
