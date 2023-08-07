import Footer from '@mintter/app/src/components/footer'
import {Container, MainWrapper, Spinner, Text, YStack} from '@mintter/ui'

export default function GroupPage() {
  return (
    <>
      <MainWrapper>
        <Container>
          <YStack tag="ul" padding={0} gap="$2">
            <Text fontFamily="$body" fontSize="$3">
              soon.
            </Text>
          </YStack>
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
