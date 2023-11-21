import Footer from '@mintter/app/components/footer'
import {Group, Role, idToUrl} from '@mintter/shared'
import {
  ButtonText,
  Container,
  ExternalLink,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {Pin, PinOff} from '@tamagui/lucide-icons'
import {useMemo} from 'react'
import {AccountLinkAvatar} from '../components/account-link-avatar'
import {
  ListItem,
  TimeAccessory,
  copyLinkMenuItem,
} from '../components/list-item'
import {MainWrapper} from '../components/main-wrapper'
import {useGroupMembers, useGroups} from '../models/groups'
import {usePinGroup} from '../models/pins'
import {useOpenUrl} from '../open-url'
import {GroupRoute} from '../utils/navigation'
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
function GroupListItem({group}: {group: Group}) {
  const navigate = useClickNavigate()
  const spawn = useNavigate('spawn')
  const groupMembers = useGroupMembers(group.id)
  const groupRoute: GroupRoute = {key: 'group', groupId: group.id}
  const {isPinned, togglePin} = usePinGroup(group.id)
  const goToItem = (e: any) => {
    navigate(groupRoute, e)
  }
  return (
    <ListItem
      title={group.title}
      accessory={
        <XStack gap="$4" ai="center">
          <SiteUrlButton group={group} />
          {groupMembers.data?.members ? (
            <MemberAvatarLinks
              ownerAccountId={group.ownerAccountId}
              groupMembers={groupMembers.data?.members}
            />
          ) : (
            <AccountLinkAvatar accountId={group.ownerAccountId} />
          )}
          <TimeAccessory time={group.createTime} onPress={goToItem} />
        </XStack>
      }
      onPress={goToItem}
      menuItems={[
        copyLinkMenuItem(idToUrl(group.id), 'Group'),
        {
          label: 'Open in new Window',
          key: 'spawn',
          icon: ExternalLink,
          onPress: () => {
            spawn(groupRoute)
          },
        },
        {
          label: isPinned ? 'Unpin Group' : 'Pin Group',
          key: 'pin',
          icon: isPinned ? PinOff : Pin,
          onPress: togglePin,
        },
      ]}
    />
  )
}

export default function GroupsPage() {
  const groupQuery = useGroups()
  const groups = groupQuery.data?.groups || []
  let content = groupQuery.isLoading ? (
    <Spinner />
  ) : groups.length > 0 ? (
    groups.map((group) => {
      return <GroupListItem group={group} key={group.id} />
    })
  ) : (
    <YStack gap="$5" paddingVertical="$8">
      <Text fontFamily="$body" fontSize="$3">
        You have no Groups yet.
      </Text>
    </YStack>
  )
  return (
    <>
      <MainWrapper>
        <Container>
          <YStack gap="$2">{content}</YStack>
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
