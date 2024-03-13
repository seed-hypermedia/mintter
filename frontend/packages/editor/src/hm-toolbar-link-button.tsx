import {BlockNoteEditor, BlockSchema} from '@/blocknote/core'
import {
  Button,
  Check,
  Close,
  Input,
  Link,
  Popover,
  SizableText,
  SizeTokens,
  Theme,
  XGroup,
} from '@mintter/ui'
import {useCallback, useState} from 'react'
import {useEditorSelectionChange} from './blocknote'
import {usePopoverState} from './use-popover-state'

export const HMLinkToolbarButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>
  size: SizeTokens
}) => {
  const [url, setUrl] = useState<string>(
    props.editor.getSelectedLinkUrl() || '',
  )
  const [text, setText] = useState<string>(props.editor.getSelectedText() || '')

  const {open, ...popoverProps} = usePopoverState()

  useEditorSelectionChange(props.editor, () => {
    setText(props.editor.getSelectedText() || '')
    setUrl(props.editor.getSelectedLinkUrl() || '')
  })

  const setLink = useCallback(
    (url: string, text?: string) => {
      popoverProps.onOpenChange(false)
      props.editor.focus()
      props.editor.createLink(url, text)
    },
    [props.editor],
  )

  return (
    <XGroup.Item>
      <Popover placement="top-end" open={open} {...popoverProps}>
        <Theme inverse={open}>
          <Popover.Trigger asChild>
            <Button
              size="$3"
              icon={Link}
              bg={'$backgroundFocus'}
              borderRadius={0}
            />
          </Popover.Trigger>
        </Theme>
        <Popover.Content p="$2">
          {url ? (
            <SizableText>CHANGE LINK</SizableText>
          ) : (
            <AddHyperlink
              setLink={(url: string) => setLink(url, text)}
              onCancel={() => popoverProps.onOpenChange(false)}
            />
          )}
        </Popover.Content>
      </Popover>
    </XGroup.Item>
  )
}

function AddHyperlink({
  setLink,
  onCancel,
}: {
  setLink: (url: string) => void
  onCancel: () => void
}) {
  const [url, setUrl] = useState<string>('')

  return (
    <XGroup bg="$backgroundFocus" elevation="$4">
      <XGroup.Item>
        <Input
          value={url}
          onChangeText={setUrl}
          minWidth="15rem"
          size="$2"
          borderWidth={0}
          placeholder="Enter a link"
          onKeyPress={(e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setLink(url)
            }
          }}
        />
      </XGroup.Item>
      <XGroup.Item>
        <Button
          size="$2"
          icon={Check}
          disabled={!url}
          borderRadius={0}
          onClick={() => {
            setLink(url)
          }}
        />
      </XGroup.Item>
      <XGroup.Item>
        <Button size="$2" icon={Close} chromeless onPress={onCancel} />
      </XGroup.Item>
    </XGroup>
  )
}
