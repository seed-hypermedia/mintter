import {
  Button,
  Copy,
  ExternalLink,
  Separator,
  SizableText,
  Stack,
  XGroup,
  copyTextToClipboard,
  toast,
} from '@shm/ui'
import {ComponentProps, FC, useState} from 'react'
import {useOpenUrl} from './open-url'

export function AccessURLRow({
  url,
  title,
  enableLink = true,
  onPress,
  icon,
  ...props
}: {
  url: string
  title?: string
  onPress?: () => void
  icon?: FC<{size: number}>
  enableLink?: boolean
} & ComponentProps<typeof XGroup>) {
  const [isClipboardCopied, setIsClipboardCopied] = useState(false)
  let IconComponent = icon || ExternalLink
  const openUrl = useOpenUrl()
  return (
    <XGroup borderColor="$color6" borderWidth="$0.5" borderRadius="$3">
      <XGroup.Item>
        <Button
          flex={1}
          size="$2"
          gap={0}
          chromeless
          onPress={() => {
            if (onPress) {
              return onPress()
            }
            if (!enableLink) return
            openUrl(url)
          }}
          width="100%"
          alignItems="center"
          justifyContent="flex-start"
        >
          <Stack flex={0} flexShrink={0} flexGrow={0}>
            <IconComponent size={12} />
          </Stack>
          <SizableText
            size="$2"
            opacity={0.8}
            textAlign="left"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            overflow="hidden"
            color="$color"
          >
            {title || url}
          </SizableText>
        </Button>
      </XGroup.Item>
      <Separator />
      <XGroup.Item>
        <Button
          flex={0}
          size="$2"
          onPress={() => {
            copyTextToClipboard(url).then(() => {
              toast.success('Link copied successfully')
            })
            setIsClipboardCopied(true)
            setTimeout(() => {
              setIsClipboardCopied(false)
            }, 2000)
          }}
          // active={isClipboardCopied}
        >
          <Copy size={16} />
        </Button>
      </XGroup.Item>
    </XGroup>
  )
}
