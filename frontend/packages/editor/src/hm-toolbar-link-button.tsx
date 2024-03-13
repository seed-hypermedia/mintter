import {BlockNoteEditor, BlockSchema} from '@/blocknote/core'
import {
  Button,
  Check,
  Close,
  Input,
  Link,
  Popover,
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
          {/* {url ? (
            <HypermediaLinkToolbar
              url={url}
              text={text}
              editHyperlink={props.editor.hyperlinkToolbar.editHyperlink}
              updateHyperlink={props.editor.hyperlinkToolbar.updateHyperlink}
              deleteHyperlink={props.editor.hyperlinkToolbar.deleteHyperlink}
              startHideTimer={props.editor.hyperlinkToolbar.startHideTimer}
              stopHideTimer={props.editor.hyperlinkToolbar.stopHideTimer}
              onChangeLink={(key: 'url' | 'text', value: string) => {
                if (key == 'text') {
                  setText(value)
                } else {
                  setUrl(value)
                }
              }}
              openUrl={() => {}}
              editor={props.editor}
            />
          ) : (
            <AddHyperlink
              setLink={(url: string) => setLink(url, text)}
              onCancel={() => popoverProps.onOpenChange(false)}
            />
          )} */}
          <AddHyperlink
            url={url}
            setLink={(url: string) => setLink(url, text)}
            onCancel={() => popoverProps.onOpenChange(false)}
          />
        </Popover.Content>
      </Popover>
    </XGroup.Item>
  )
}

function AddHyperlink({
  setLink,
  onCancel,
  url = '',
}: {
  setLink: (url: string) => void
  onCancel: () => void
  url?: string
}) {
  const [_url, setUrl] = useState<string>(url)

  return (
    <XGroup bg="$backgroundFocus" elevation="$4">
      <XGroup.Item>
        <Input
          value={_url}
          onChangeText={setUrl}
          minWidth="15rem"
          size="$2"
          borderWidth={0}
          placeholder="Enter a link"
          onKeyPress={(e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setLink(_url)
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
