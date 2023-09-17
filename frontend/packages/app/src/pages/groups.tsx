import Footer from '@mintter/app/src/components/footer'
import {
  Button,
  Container,
  ExternalLink,
  MainWrapper,
  Spinner,
  Text,
  YStack,
} from '@mintter/ui'
import {useGroupMembers, useGroups} from '../models/groups'
import {Group, Role} from '@mintter/shared'
import {GroupRoute} from '../utils/navigation'
import {useClickNavigate} from '../utils/useNavigate'
import {useNavigate} from '../utils/useNavigate'
import {GestureResponderEvent} from 'react-native'
import {ListItem, TimeAccessory} from '../components/list-item'
import {AccountLinkAvatar} from '../components/account-link-avatar'

function MemberAvatarLinks({
  ownerAccountId,
  groupMembers,
}: {
  groupMembers: Record<string, Role>
  ownerAccountId: string
}) {
  return (
    <>
      <AccountLinkAvatar accountId={ownerAccountId} />
      {Object.keys(groupMembers).map((accountId) => {
        if (accountId == ownerAccountId) return null
        return <AccountLinkAvatar accountId={accountId} key={accountId} />
      })}
    </>
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
        <>
          {groupMembers.data?.members ? (
            <MemberAvatarLinks
              ownerAccountId={group.ownerAccountId}
              groupMembers={groupMembers.data?.members}
            />
          ) : (
            <AccountLinkAvatar accountId={group.ownerAccountId} />
          )}
          <TimeAccessory time={group.createTime} onPress={goToItem} />
        </>
      }
      onPress={goToItem}
      menuItems={[
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
