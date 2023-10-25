import {Button, Heading, SizableText, Text, XStack, YStack} from '@mintter/ui'
import {FallbackProps} from 'react-error-boundary'

export function AppError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <XStack jc="center" ai="center" f={1} backgroundColor={'$color2'}>
      <YStack
        space
        theme="red"
        backgroundColor="$color1"
        maxWidth={500}
        padding="$4"
        f={1}
        borderRadius="$4"
      >
        <Heading color="$red10">Something went wrong</Heading>
        <YStack padding="$4" backgroundColor={'$gray2'} borderRadius="$2">
          <SizableText tag="pre" fontFamily={'$mono'}>
            {error.message}
          </SizableText>
        </YStack>
        <XStack jc="center">
          <Button onPress={resetErrorBoundary}>Try again</Button>
        </XStack>
      </YStack>
    </XStack>
  )
}

export function AppErrorPage({message}: {message: string}) {
  return (
    <YStack role="alert" space>
      <Text>App Error</Text>
      <Text tag="pre">{message}</Text>
      <Text>Quit and re-launch the app to try again.</Text>
    </YStack>
  )
}
