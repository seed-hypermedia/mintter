import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {
  Button,
  Copy,
  Globe,
  Separator,
  SizableText,
  Stack,
  XGroup,
} from '@mintter/ui'
import {open} from '@tauri-apps/api/shell'
import {useState} from 'react'
import {toast} from 'react-hot-toast'

export function AccessURLRow({
  url,
  title,
  enableLink = true,
}: {
  url: string
  title?: string
  enableLink?: boolean
}) {
  const [isClipboardCopied, setIsClipboardCopied] = useState(false)
  return (
    <XGroup borderColor="$color6" borderWidth="$0.5" borderRadius="$3">
      <XGroup.Item>
        <Button
          flex={1}
          size="$2"
          gap={0}
          chromeless
          onPress={() => {
            if (!enableLink) return
            open(url)
          }}
          width="100%"
          alignItems="center"
          justifyContent="flex-start"
        >
          <Stack flex={0} flexShrink={0} flexGrow={0}>
            <Globe size={12} />
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
          chromeless
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
          active={isClipboardCopied}
        >
          <Copy size={16} />
        </Button>
      </XGroup.Item>
    </XGroup>
  )
}
