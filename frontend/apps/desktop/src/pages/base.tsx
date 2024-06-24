import { Heading, Spinner, Text, YStack } from '@shm/ui'

export function NotFoundPage() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center">
      <Heading>404</Heading>
      <Text>Page not found</Text>
    </YStack>
  )
}

export function BaseLoading() {
  return (
    <YStack padding="$6">
      <Spinner />
    </YStack>
  )
}
