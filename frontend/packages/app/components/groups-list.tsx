import {Group, HMGroup, Role} from '@mintter/shared'
import {ButtonText, ExternalLink, Text, XStack} from '@mintter/ui'
import {Trash} from '@tamagui/lucide-icons'
import {useMemo} from 'react'
import {AccountLinkAvatar} from '../components/account-link-avatar'
import {FavoriteButton} from '../components/favoriting'
import {
  ListItem,
  TimeAccessory,
  copyLinkMenuItem,
} from '../components/list-item'
import {MenuItemType} from '../components/options-dropdown'
import {useFavorite} from '../models/favorites'
import {useGatewayUrl} from '../models/gateway-settings'
import {useGroupMembers} from '../models/groups'
import {useOpenUrl} from '../open-url'
import {GroupRoute} from '../utils/routes'
import {hostnameStripProtocol} from '../utils/site-hostname'
import {useClickNavigate, useNavigate} from '../utils/useNavigate'

function MemberAvatarLinks({
  ownerAccountId,
  groupMembers,
}: {
  groupMembers: Record<string, Role>
  ownerAccountId: string
}) {
  let totalEditors = useMemo(() => {
    return Object.keys(groupMembers).filter((m) => m != ownerAccountId)
  }, [groupMembers, ownerAccountId])

  let editors =
    totalEditors.length > 3 ? totalEditors.slice(0, 2) : totalEditors

  // let restEditors = totalEditors.length > 3 ? totalEditors.slice(2) : []
  return (
    <XStack>
      <XStack
        borderColor="$background"
        backgroundColor="$background"
        borderWidth={2}
        borderRadius={100}
        marginLeft={-8}
        animation="fast"
      >
        <AccountLinkAvatar accountId={ownerAccountId} />
      </XStack>
      {editors.map((accountId, idx) => {
        return (
          <XStack
            zIndex={idx + 1}
            key={accountId}
            borderColor="$background"
            backgroundColor="$background"
            borderWidth={2}
            borderRadius={100}
            marginLeft={-8}
            animation="fast"
          >
            <AccountLinkAvatar accountId={accountId} />
          </XStack>
        )
      })}
      {totalEditors.length > editors.length ? (
        <XStack
          zIndex={editors.length}
          borderColor="$background"
          backgroundColor="$background"
          borderWidth={2}
          borderRadius={100}
          marginLeft={-8}
          animation="fast"
          width={24}
          height={24}
          ai="center"
          jc="center"
        >
          <Text
            fontSize={10}
            fontFamily="$body"
            fontWeight="bold"
            color="$color10"
          >
            +{totalEditors.length - editors.length - 1}
          </Text>
        </XStack>
      ) : null}
    </XStack>
  )
}

function SiteUrlButton({group}: {group: Group}) {
  const siteBaseUrl = group.siteInfo?.baseUrl
  const openUrl = useOpenUrl()
  if (!siteBaseUrl) return null
  return (
    <ButtonText
      color="$blue10"
      size="$2"
      hoverStyle={{textDecorationLine: 'underline'}}
      fontFamily={'$mono'}
      onPress={(e) => {
        e.stopPropagation()
        openUrl(siteBaseUrl)
      }}
    >
      {hostnameStripProtocol(siteBaseUrl)}
    </ButtonText>
  )
}

export function GroupListItem({
  group,
  onCopy,
  onDelete,
}: {
  group: HMGroup
  onCopy?: () => void
  onDelete?: (input: {id: string; title?: string}) => void
}) {
  const navigate = useClickNavigate()
  const spawn = useNavigate('spawn')
  const groupMembers = useGroupMembers(group.id)
  const favorite = useFavorite(group.id)
  const groupRoute: GroupRoute = {key: 'group', groupId: group.id}
  const goToItem = (e: any) => {
    navigate(groupRoute, e)
  }
  const gwUrl = useGatewayUrl()
  const menuItems: MenuItemType[] = []
  if (onCopy) {
    menuItems.push(copyLinkMenuItem(onCopy, 'Group'))
  }
  menuItems.push({
    label: 'Open in new Window',
    key: 'spawn',
    icon: ExternalLink,
    onPress: () => {
      spawn(groupRoute)
    },
  })
  if (onDelete) {
    menuItems.push({
      label: 'Delete Group',
      key: 'delete',
      icon: Trash,
      onPress: () => {
        if (!group.id) return
        onDelete({id: group.id, title: group.title})
      },
    })
  }
  return (
    <ListItem
      title={group.title}
      accessory={
        <XStack gap="$4" ai="center">
          {group.id && (
            <XStack
              opacity={favorite.isFavorited ? 1 : 0}
              $group-item-hover={
                favorite.isFavorited ? undefined : {opacity: 1}
              }
            >
              <FavoriteButton url={group.id} />
            </XStack>
          )}
          <SiteUrlButton group={group} />
          {groupMembers.data?.members ? (
            <MemberAvatarLinks
              ownerAccountId={group.ownerAccountId}
              groupMembers={groupMembers.data?.members}
            />
          ) : (
            <AccountLinkAvatar accountId={group.ownerAccountId} />
          )}
          <TimeAccessory
            tooltipLabel="Last update:"
            time={group.updateTime}
            onPress={goToItem}
          />
        </XStack>
      }
      onPress={goToItem}
      menuItems={menuItems}
    />
  )
}
