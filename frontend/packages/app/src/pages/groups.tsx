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
import {useGroups} from '../models/groups'
import {Group} from '@mintter/shared'
import {GroupRoute, useClickNavigate, useNavigate} from '../utils/navigation'
import {GestureResponderEvent} from 'react-native'
import {ListItem, TimeAccessory} from '../components/list-item'
import {AccountLinkAvatar} from '../components/account-link-avatar'

function GroupListItem({group}: {group: Group}) {
  const navigate = useClickNavigate()
  const spawn = useNavigate('spawn')
  const groupRoute: GroupRoute = {key: 'group', groupId: group.id}
  const goToItem = (e: GestureResponderEvent) => {
    navigate(groupRoute, e)
  }
  return (
    <ListItem
      title={group.title}
      accessory={
        <>
          <AccountLinkAvatar accountId={group.ownerAccountId} />
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
          <YStack tag="ul" padding={0} gap="$2">
            {content}
          </YStack>
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
