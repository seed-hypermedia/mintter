import {useAccount} from '@mintter/app/models/accounts'
import {TimelineChange} from '@mintter/app/models/changes'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  Change,
  GroupVariant,
  createHmId,
  createPublicWebHmUrl,
  formattedDateLong,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {ListDocumentGroupsResponse_Item} from '@mintter/shared/src/client/.generated/groups/v1alpha/groups_pb'
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
  copyUrlToClipboardWithFeedback,
  toast,
} from '@mintter/ui'
import {ArrowUpRight, Upload} from '@tamagui/lucide-icons'
import {createContext, useContext} from 'react'
import appError from '../errors'
import {useDocHistory} from '../models/changes'
import {useGatewayUrl} from '../models/gateway-settings'
import {
  useCurrentDocumentGroups,
  useGroup,
  useGroupContent,
  useMyGroups,
  usePublishDocToGroup,
} from '../models/groups'
import {useOpenUrl} from '../open-url'
import {useNavRoute} from '../utils/navigation'
import {NavRoute} from '../utils/routes'
import {AccessoryContainer} from './accessory-sidebar'
import {AccountLinkAvatar} from './account-link-avatar'
import {useAppDialog} from './dialog'
import {MenuItemType, OptionsDropdown} from './options-dropdown'

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
  const pubVariants = route?.key === 'publication' ? route.variants : undefined
  const docId = route?.key === 'publication' ? route.documentId : undefined
  const groupVariant = pubVariants?.key === 'group' ? pubVariants : null
  const myGroups = useMyGroups()
  const isInPostableContext =
    groupVariant &&
    myGroups.data?.items?.find(
      (item) => item.group?.id === groupVariant?.groupId,
    )
  const postToGroup = useAppDialog(PostToGroupDialog)
  const currentGroups = useCurrentDocumentGroups(docId)
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
          <YStack
            paddingHorizontal="$4"
            paddingVertical="$2"
            paddingBottom="$6"
            borderBottomColor="$borderColor"
            borderBottomWidth={1}
          >
            {changes.map((item, index) => {
              const activeGroups = currentGroups.data?.filter((groupEntry) => {
                const docId = unpackDocId(groupEntry.rawUrl)
                return (
                  item && !!docId?.version && item.change.id === docId?.version
                )
              })
              const change = item?.change
              if (!change) return null
              return (
                <ChangeItem
                  prevListedChange={changes[index - 1]}
                  entityId={id.id}
                  key={change.id}
                  change={change}
                  activeGroups={activeGroups}
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

function ChangeItem({
  change,
  prevListedChange,
  entityId,
  activeVersion,
  activeGroups,
}: {
  change: Change
  prevListedChange?: TimelineChange
  entityId: string
  activeVersion?: string
  activeGroups?: ListDocumentGroupsResponse_Item[] | undefined
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
  const variants =
    navRoute.key === 'publication' ? navRoute.variants : undefined
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
      listCategory: navRoute.listCategory,
    }
  } else if (navRoute.key === 'publication') {
    destRoute = {
      key: 'publication',
      documentId: entityId,
      versionId: change.id,
      variants: navRoute.variants,
      accessory: {key: 'versions'},
    }
  }
  const parsedEntityId = unpackHmId(entityId)
  const gwUrl = useGatewayUrl()
  const publicWebUrl =
    parsedEntityId &&
    createPublicWebHmUrl(parsedEntityId?.type, parsedEntityId?.eid, {
      version: change.id,
      hostname: gwUrl.data,
      variants,
    })
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
        copyUrlToClipboardWithFeedback(publicWebUrl, 'Version')
      },
      label: 'Copy Link to Version',
    })
  }
  const open = useOpenUrl()
  if (parsedEntityId) {
    menuItems.push({
      key: 'openNewWindow',
      icon: ArrowUpRight,
      onPress: () => {
        open(
          createHmId(parsedEntityId.type, parsedEntityId.eid, {
            version: change.id,
          }),
          true,
        )
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
      userSelect="none"
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
        {activeGroups?.length ? (
          <ActiveChangeGroups activeGroups={activeGroups} />
        ) : null}
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

function ActiveChangeGroups({
  activeGroups,
}: {
  activeGroups: ListDocumentGroupsResponse_Item[]
}) {
  return (
    <XStack gap="$2" flexWrap="wrap" margin="$1" marginTop={0} marginLeft={34}>
      {activeGroups.map((group) => (
        <ActiveGroupButton key={group.groupId} groupItem={group} />
      ))}
    </XStack>
  )
}
function ActiveGroupButton({
  groupItem,
}: {
  groupItem: ListDocumentGroupsResponse_Item
}) {
  const group = useGroup(groupItem.groupId)
  const navigate = useNavigate()
  if (!group.data?.title) return null
  return (
    <Button
      chromeless
      size="$1"
      theme="blue"
      paddingHorizontal="$2"
      borderColor="$blue11"
      color="$blue11"
      bg="$backgroundTransparent"
      hoverStyle={{
        borderColor: '$blue8',
      }}
      onPress={(e) => {
        e.stopPropagation()
        navigate({key: 'group', groupId: groupItem.groupId})
      }}
    >
      {group.data?.title}
    </Button>
  )
}

function PostToGroupDialog({
  input,
  onClose,
}: {
  input: {
    groupVariant: GroupVariant
    changeId: string
    docId: string
  }
  onClose: () => void
}) {
  const group = useGroup(input.groupVariant.groupId)
  const groupContent = useGroupContent(input.groupVariant.groupId)
  const publish = usePublishDocToGroup()
  const prevItem =
    input.groupVariant.pathName &&
    groupContent.data?.content?.[input.groupVariant.pathName]
  // const prevItemId = prevItem ? unpackHmId(prevItem) : null
  const navigate = useNavigate()
  return (
    <>
      <DialogTitle>Update &quot;{group.data?.title}&quot;</DialogTitle>
      <DialogDescription>
        Replace &quot;{input.groupVariant?.pathName}
        &quot; with this version?
      </DialogDescription>
      <YStack gap="$1">
        <Button
          theme="green"
          iconAfter={publish.isLoading ? <Spinner /> : null}
          onPress={() => {
            if (!input.groupVariant.pathName) {
              onClose()
              return
            }
            publish
              .mutateAsync({
                docId: input.docId,
                groupId: input.groupVariant.groupId,
                pathName: input.groupVariant.pathName,
                version: input.changeId,
              })
              .then(() => {
                onClose()
                navigate({
                  key: 'publication',
                  documentId: input.docId,
                  variants: [input.groupVariant],
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

const PostToGroup = createContext<null | ((changeId: string) => void)>(null)
