import {
  BaseUiElementState,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  HyperlinkToolbarProsemirrorPlugin,
  HyperlinkToolbarState,
} from '@/editor/blocknote/core'
import Tippy from '@tippyjs/react'
import {FC, useEffect, useMemo, useRef, useState} from 'react'

import {HMBlockSchema} from '@/editor/schema'
import {DefaultHyperlinkToolbar} from './DefaultHyperlinkToolbar'

export type HyperlinkToolbarProps = Pick<
  HyperlinkToolbarProsemirrorPlugin<any>,
  | 'editHyperlink'
  | 'deleteHyperlink'
  | 'startHideTimer'
  | 'stopHideTimer'
  | 'updateHyperlink'
> &
  Omit<HyperlinkToolbarState, keyof BaseUiElementState> & {
    editor: BlockNoteEditor<HMBlockSchema>
    onChangeLink: any
  }

export const HyperlinkToolbarPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema,
>(props: {
  openUrl: (url?: string | undefined, newWindow?: boolean | undefined) => void
  editor: BlockNoteEditor<BSchema>
  hyperlinkToolbar?: FC<HyperlinkToolbarProps>
}) => {
  const [show, setShow] = useState<boolean>(false)
  const [url, setUrl] = useState<string>()
  const [text, setText] = useState<string>()

  const referencePos = useRef<DOMRect>()

  useEffect(() => {
    return props.editor.hyperlinkToolbar.on(
      'update',
      (hyperlinkToolbarState) => {
        setShow(hyperlinkToolbarState.show)
        setUrl(hyperlinkToolbarState.url)
        setText(hyperlinkToolbarState.text)

        referencePos.current = hyperlinkToolbarState.referencePos
      },
    )
  }, [props.editor])

  const getReferenceClientRect = useMemo(
    () => {
      if (!referencePos.current) {
        return undefined
      }

      return () => referencePos.current!
    },
    [referencePos.current], // eslint-disable-line
  )

  const hyperlinkToolbarElement = useMemo(() => {
    if (!url || !text) {
      return null
    }

    const HyperlinkToolbar = props.hyperlinkToolbar || DefaultHyperlinkToolbar

    return (
      <HyperlinkToolbar
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
        openUrl={props.openUrl}
        editor={props.editor}
      />
    )
  }, [props.hyperlinkToolbar, props.editor, text, url])

  return (
    <Tippy
      appendTo={props.editor.domElement.parentElement!}
      // onHidden={() => setIsEditing(false)}
      content={hyperlinkToolbarElement}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={'fade'}
      placement={'top-start'}
    />
  )
}
