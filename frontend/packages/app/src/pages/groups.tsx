import Footer from '@mintter/app/src/components/footer'
import {Container, MainWrapper, Spinner, Text, YStack} from '@mintter/ui'
import {useGroups} from '../models/groups'

export default function GroupsPage() {
  const contacts = useGroups()
  const groups = contacts.data?.groups || []
  let content = contacts.isLoading ? (
    <Spinner />
  ) : groups.length > 0 ? (
    groups.map((group) => {
      return
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
