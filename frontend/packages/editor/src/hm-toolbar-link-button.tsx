import {BlockNoteEditor, BlockSchema} from '@/blocknote/core'
import {Button, Link, Popover, SizeTokens, Theme, XGroup} from '@mintter/ui'
import {useCallback, useState} from 'react'
import {useEditorSelectionChange} from './blocknote'
import {HypermediaLinkToolbar} from './hyperlink-toolbar'
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
      props.editor.focus()
      props.editor.createLink(url, text)
    },
    [props.editor],
  )

  return (
    <XGroup.Item>
      <Popover placement="top" open={open} {...popoverProps}>
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
        <Popover.Content>
          <HypermediaLinkToolbar
            {...props.editor.hyperlinkToolbar}
            url={url}
            text={text}
            openUrl={() => {}}
            editor={props.editor}
          />
        </Popover.Content>
      </Popover>
    </XGroup.Item>
  )
}
