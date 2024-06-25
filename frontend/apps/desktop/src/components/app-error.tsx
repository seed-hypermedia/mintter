import {useSidebarContext} from '@/sidebar-context'
import {Button, Heading, SizableText, XStack, YStack, useStream} from '@shm/ui'
import {FallbackProps} from 'react-error-boundary'
import {ErrorBar} from './error-bar'

export function AppErrorPage({error, resetErrorBoundary}: FallbackProps) {
  const ctx = useSidebarContext()
  const isLocked = useStream(ctx.isLocked)
  return (
    <YStack flex={1}>
      <ErrorBar isSidebarLocked={isLocked} />
      <AppErrorContent
        message={error.message}
        resetErrorBoundary={resetErrorBoundary}
      />
    </YStack>
  )
}

export function RootAppError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <AppErrorContent
      message={error.message}
      resetErrorBoundary={resetErrorBoundary}
    />
  )
}

export function AppErrorContent({
  message,
  resetErrorBoundary,
}: {
  message: string
  resetErrorBoundary?: () => void
}) {
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
            {message}
          </SizableText>
        </YStack>
        {resetErrorBoundary && (
          <XStack jc="center">
            <Button onPress={resetErrorBoundary}>Try again</Button>
          </XStack>
        )}
      </YStack>
    </XStack>
  )
}
