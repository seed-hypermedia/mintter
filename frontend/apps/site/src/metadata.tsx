import { Button, Share, SizableText, XStack } from '@shm/ui'

export function OpenInAppLink({url}: {url: string}) {
  return (
    <Button
      size="$2"
      chromeless
      icon={Share}
      tag="a"
      href={url}
      userSelect="none"
    >
      <XStack flex={1} alignItems="center">
        <SizableText size="$2">Open in Seed app</SizableText>
      </XStack>
    </Button>
  )
}
