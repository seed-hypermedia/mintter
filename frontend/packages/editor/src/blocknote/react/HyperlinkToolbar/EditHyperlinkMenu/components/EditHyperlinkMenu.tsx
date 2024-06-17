import {createStyles} from '@mantine/core'
import {createHmDocLink} from '@shm/shared'
import {
  Button,
  Check,
  Checkbox,
  ExternalLink,
  Input,
  Label,
  LinkIcon,
  Separator,
  TextCursorInput,
  Tooltip,
  Unlink,
  XStack,
  YStack,
} from '@shm/ui'
import {HTMLAttributes, forwardRef, useState} from 'react'

export type EditHyperlinkMenuProps = {
  url: string
  text: string
  update: (url: string, text: string, latest: boolean) => void
  openUrl: (url?: string | undefined, newWindow?: boolean | undefined) => void
}

/**
 * Menu which opens when editing an existing hyperlink or creating a new one.
 * Provides input fields for setting the hyperlink URL and title.
 */
export const EditHyperlinkMenu = forwardRef<
  HTMLDivElement,
  EditHyperlinkMenuProps & HTMLAttributes<HTMLDivElement>
>(({url, text, update, className, ...props}, ref) => {
  const {classes} = createStyles({root: {}})(undefined, {
    name: 'EditHyperlinkMenu',
  })

  const [currentUrl, setCurrentUrl] = useState(url)
  const [currentText, setCurrentText] = useState(text)

  return (
    <YStack
      p="$2"
      gap="$2"
      borderRadius="$4"
      overflow="hidden"
      bg="$backgroundStrong"
      elevation="$3"
      zIndex="$zIndex.5"
      bottom="0"
      position="absolute"
    >
      <XStack ai="center" gap="$2" p="$1">
        <TextCursorInput size={12} />
        <Input
          flex={1}
          size={formSize}
          placeholder="link text"
          id="link-text"
          key={props.text}
          value={props.text}
        />
      </XStack>
      <XStack ai="center" gap="$2" p="$1">
        <LinkIcon size={12} />
        <Input flex={1} size="$2" key={props.url} value={props.url} />
      </XStack>
      <Separator />
      <YStack p="$1">
        <XStack ai="center" gap="$2">
          {unpackedRef ? (
            <XStack ai="center" minWidth={200} gap="$2">
              <Checkbox
                id="link-latest"
                key={props.url}
                size="$2"
                defaultChecked={!!unpackedRef.latest}
                onCheckedChange={(newValue) => {
                  let newUrl = createHmDocLink({
                    documentId: unpackedRef?.qid,
                    version: unpackedRef?.version,
                    blockRef: unpackedRef?.blockRef,
                    variants: unpackedRef?.variants,
                    latest: newValue != 'indeterminate' ? newValue : false,
                  })

                  console.log('== NEW URL', newValue)

                  props.editHyperlink(newUrl, props.text, true)
                }}
              >
                <Checkbox.Indicator>
                  <Check />
                </Checkbox.Indicator>
              </Checkbox>
              <Label htmlFor="link-latest" size={formSize}>
                Link to Latest Version
              </Label>
            </XStack>
          ) : null}
          <Tooltip content="Remove link">
            <Button
              chromeless
              size="$1"
              icon={Unlink}
              onPress={props.deleteHyperlink}
            />
          </Tooltip>
          <Tooltip content="Open in a new Window">
            <Button
              chromeless
              size="$1"
              icon={ExternalLink}
              onPress={() => props.openUrl(props.url, true)}
            />
          </Tooltip>
        </XStack>
      </YStack>
    </YStack>
  )
})
