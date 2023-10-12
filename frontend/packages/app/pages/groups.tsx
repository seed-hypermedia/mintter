import Footer from '@mintter/app/components/footer'
import {Group, Role, idToUrl} from '@mintter/shared'
import {
  ButtonText,
  Container,
  ExternalLink,
  MainWrapper,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {GestureResponderEvent} from 'react-native'
import {
  ListItem,
  TimeAccessory,
  copyLinkMenuItem,
} from '../components/list-item'
import {useGroupMembers, useGroups} from '../models/groups'
import {GroupRoute} from '../utils/navigation'
import {useClickNavigate, useNavigate} from '../utils/useNavigate'
import {AccountLinkAvatar} from '../components/account-link-avatar'
import {useOpenUrl} from '../open-url'
import {hostnameStripProtocol} from '../utils/site-hostname'

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

function SiteUrlButton({group}: {group: Group}) {
  const siteBaseUrl = group.siteInfo?.baseUrl
  const openUrl = useOpenUrl()
  if (!siteBaseUrl) return null
  return (
    <ButtonText
      color="$blue10"
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
  const goToItem = (e: GestureResponderEvent) => {
    navigate(groupRoute, e)
  }
  return (
    <ListItem
      title={group.title}
      accessory={
        <XStack gap="$4">
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
