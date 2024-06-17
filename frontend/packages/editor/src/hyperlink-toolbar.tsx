import {createHmDocLink, unpackHmId} from '@shm/shared'
import {
  Button,
  Check,
  Checkbox,
  ExternalLink,
  Input,
  Label,
  LinkIcon,
  Separator,
  SizeTokens,
  TextCursorInput,
  Tooltip,
  Unlink,
  XStack,
  YStack,
} from '@shm/ui'
import {useEffect, useMemo, useState} from 'react'
import {HyperlinkToolbarProps} from './blocknote'

export function HypermediaLinkToolbar(
  props: HyperlinkToolbarProps & {
    openUrl: (url?: string | undefined, newWindow?: boolean | undefined) => void
  },
) {
  const formSize: SizeTokens = '$2'

  const [_url, setUrl] = useState(props.url || '')
  const [_text, setText] = useState(props.text || '')
  const unpackedRef = useMemo(() => unpackHmId(_url), [_url])
  const _latest = unpackedRef?.latest || false

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key == 'Enter') {
      event.preventDefault()
      props.editHyperlink(_url, _text)
    }
  }

  useEffect(() => {
    props.editor.hyperlinkToolbar.on('update', (state) => {
      setText(state.text || '')
      setUrl(state.url || '')
    })
  }, [props.editor])

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [])

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
      onMouseEnter={props.stopHideTimer}
      onMouseLeave={props.startHideTimer}
    >
      <XStack ai="center" gap="$2" p="$1">
        <TextCursorInput size={12} />
        <Input
          flex={1}
          size={formSize}
          placeholder="link text"
          id="link-text"
          key={props.text}
          value={_text}
          onKeyPress={handleKeydown}
          onChangeText={(val) => {
            setText(val)
            props.updateHyperlink(props.url, val)
          }}
        />
      </XStack>
      <XStack ai="center" gap="$2" p="$1">
        <LinkIcon size={12} />
        <Input
          flex={1}
          size="$2"
          key={props.url}
          value={_url}
          onKeyPress={handleKeydown}
          onChangeText={(val) => {
            setUrl(val)
            props.updateHyperlink(val, props.text)
          }}
        />
      </XStack>
      <Separator />
      <YStack p="$1">
        <XStack ai="center" gap="$2">
          {unpackedRef ? (
            <XStack ai="center" minWidth={200} gap="$2">
              <Checkbox
                id="link-latest"
                size="$2"
                key={_latest}
                value={_latest}
                onCheckedChange={(newValue) => {
                  let newUrl = createHmDocLink({
                    documentId: unpackedRef?.qid,
                    version: unpackedRef?.version,
                    blockRef: unpackedRef?.blockRef,
                    variants: unpackedRef?.variants,
                    latest: newValue != 'indeterminate' ? newValue : false,
                  })
                  console.log('== newUrl', newUrl)
                  props.updateHyperlink(newUrl, props.text)
                  setUrl(newUrl)
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
}
