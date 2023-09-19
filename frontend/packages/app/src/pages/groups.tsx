import Footer from '@mintter/app/src/components/footer'
import {Group, Role, idToUrl} from '@mintter/shared'
import {
  Container,
  ExternalLink,
  MainWrapper,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {GestureResponderEvent} from 'react-native'
import {AccountLinkAvatar} from '../components/account-link-avatar'
import {
  ListItem,
  TimeAccessory,
  copyLinkMenuItem,
} from '../components/list-item'
import {useGroupMembers, useGroups} from '../models/groups'
import {GroupRoute} from '../utils/navigation'
import {useClickNavigate, useNavigate} from '../utils/useNavigate'

function MemberAvatarLinks({
  ownerAccountId,
  groupMembers,
}: {
  groupMembers: Record<string, Role>
  ownerAccountId: string
}) {
  return (
    <XStack>
      <AccountLinkAvatar accountId={ownerAccountId} />
      {Object.keys(groupMembers).map((accountId) => {
        if (accountId == ownerAccountId) return null
        return <AccountLinkAvatar accountId={accountId} key={accountId} />
      })}
    </XStack>
  )
}

function GroupListItem({group}: {group: Group}) {
  const navigate = useClickNavigate()
  const spawn = useNavigate('spawn')
  const groupMembers = useGroupMembers(group.id)
  const groupRoute: GroupRoute = {key: 'group', groupId: group.id}
  const goToItem = (e: GestureResponderEvent) => {
    navigate(groupRoute, e)
  }
  return (
    <ListItem
      title={group.title}
      accessory={
        <XStack gap="$4">
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
