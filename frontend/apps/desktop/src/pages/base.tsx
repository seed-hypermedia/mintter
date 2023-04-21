import {Heading, Text, YStack} from '@mintter/ui'

export function NotFoundPage() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center">
      <Heading>404</Heading>
      <Text>Page not found</Text>
    </YStack>
  )
}
