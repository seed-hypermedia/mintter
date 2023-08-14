import Footer from '@mintter/app/src/components/footer'
import {
  Button,
  Container,
  MainWrapper,
  Spinner,
  Text,
  YStack,
} from '@mintter/ui'
import {useGroups} from '../models/groups'
import {Group} from '@mintter/shared'
import {useNavigate} from '../utils/navigation'

function GroupListItem({group}: {group: Group}) {
  const navigate = useNavigate()
  return (
    <Button
      onPress={() => {
        navigate({key: 'group', groupId: group.id})
      }}
    >
      {group.title}
    </Button>
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
