import {Button, Share, SizableText, XStack} from '@mintter/ui'

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
        <SizableText size="$2">Open in Mintter app</SizableText>
      </XStack>
    </Button>
  )
}
