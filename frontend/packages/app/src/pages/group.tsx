import Footer from '@mintter/app/src/components/footer'
import {Container, MainWrapper, Text, YStack} from '@mintter/ui'
import {useGroup} from '../models/groups'
import {useNavRoute} from '../utils/navigation'
import {AccountLinkAvatar} from '../components/account-link-avatar'

export default function GroupPage() {
  const route = useNavRoute()
  if (route.key !== 'group') throw new Error('Group page needs group route')
  const {groupId} = route
  const group = useGroup(groupId)
  return (
    <>
      <MainWrapper>
        <Container>
          <YStack
            gap="$2"
            borderBottomWidth={1}
            borderColor="$gray6"
            paddingVertical="$4"
            paddingHorizontal={0}
          >
            <Text fontFamily="$body" fontSize="$3">
              {group.data?.description}
            </Text>
          </YStack>
          <YStack
            gap="$2"
            borderBottomWidth={1}
            borderColor="$gray6"
            paddingVertical="$4"
            paddingHorizontal={0}
          >
            <AccountLinkAvatar accountId={group.data?.ownerAccountId} />
          </YStack>
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
