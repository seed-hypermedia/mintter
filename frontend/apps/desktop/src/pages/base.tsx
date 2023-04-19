import {MainActor} from '@app/models/main-actor'
import {Heading, YStack, Text} from '@mintter/ui'

export type PageProps = {
  mainActor?: MainActor
}

export function NotFoundPage(props: PageProps) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center">
      <Heading>404</Heading>
      <Text>Page not found</Text>
    </YStack>
  )
}
