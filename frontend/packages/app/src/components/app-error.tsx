import {Button, Text, YStack} from '@mintter/ui'
import {FallbackProps} from 'react-error-boundary'

export function AppError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <YStack role="alert" space>
      <Text>Something went wrong loading the App:</Text>
      <Text tag="pre">{error.message}</Text>
      <Button onPress={resetErrorBoundary}>Try again</Button>
    </YStack>
  )
}
