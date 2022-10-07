import {image, isCode, text} from '@app/mttast'
import {Mark} from '@app/mttast/types'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {flip, inline, offset, shift, useFloating} from '@floating-ui/react-dom'
import {css} from '@stitches/react'
import {PropsWithChildren, useEffect, useMemo, useState} from 'react'
import {Editor, Range, Text, Transforms} from 'slate'
import {ReactEditor, useFocused, useSlate} from 'slate-react'
import {MARK_EMPHASIS} from './emphasis'
import {MARK_CODE} from './inline-code'
import {InsertLinkButton} from './link'
import {MARK_STRONG} from './strong'
import {MARK_UNDERLINE} from './underline'
import {isFormatActive, toggleFormat} from './utils'

export function EditorHoveringToolbar() {
  const editor = useSlate()
  const [selectionColor, setSelectionColor] = useState<string>('')

  useEffect(() => {
    const nodes = Editor.nodes(editor, {
      match: Text.isText,
      mode: 'all',
    })

    const selectionColors = new Set([...nodes].map(([node]) => node.color))

    const maybeColor =
      selectionColors.size === 1 ? [...selectionColors.values()][0] : null

    setSelectionColor(maybeColor || 'invalid color')
  }, [editor.selection])

  const codeInSelection = useMemo(
    () => [...Editor.nodes(editor)].some(([node]) => isCode(node)),
    [editor, editor.selection],
  )

  return (
    <HoveringToolbar>
      <Box
        css={{
          zIndex: '$max',
          boxShadow: '$menu',
          padding: '$2',
          backgroundColor: '$base-background-normal',
          borderRadius: '2px',
          transition: 'opacity 0.5s',
          display: 'flex',
          gap: '$2',
          paddingHorizontal: '$2',
          '& > *': {
            display: 'inline-block',
          },
          '& > * + *': {
            marginLeft: 2,
          },
        }}
      >
        <FormatButton format={MARK_STRONG} icon="Strong" />
        <FormatButton format={MARK_EMPHASIS} icon="Emphasis" />
        <FormatButton format={MARK_UNDERLINE} icon="Underline" />
        <FormatButton format={MARK_CODE} icon="Code" />
        <Tooltip content={<span>Text color</span>}>
          {!codeInSelection ? (
            <input
              type="color"
              className={textSelectorStyles()}
              value={selectionColor}
              onChange={(ev) =>
                Transforms.setNodes(
                  editor,
                  {color: ev.target.value},
                  {match: Text.isText, split: true, mode: 'highest'},
                )
              }
            />
          ) : null}
        </Tooltip>
        <InsertLinkButton />
        <InsertImageButton />
      </Box>
    </HoveringToolbar>
  )
}

export function PublicationHoveringToolbar() {
  return <HoveringToolbar>copy reference</HoveringToolbar>
}

const textSelectorStyles = css({
  '$$outlined-border-size': '1px',
  width: '2em',
  height: '2em',
  fontSize: '$2',
  lineHeight: '$1',
  padding: '$1',
  // margin
  transition: 'width 2s, margin: 2s',
  '::invalid': {
    border: '2px solid red',
  },
})

function FormatButton({
  format,
  icon,
}: {
  format: Mark
  icon: keyof typeof icons
}) {
  const editor = useSlate()

  return (
    <Button
      variant="ghost"
      size="0"
      color="muted"
      css={
        isFormatActive(editor, format)
          ? {
              backgroundColor: '$base-component-bg-active',
              color: '$base-text-high',
              '&:hover': {
                backgroundColor: '$base-border-normal !important',
                color: '$base-text-high !important',
              },
            }
          : {}
      }
      onClick={() => toggleFormat(editor, format)}
    >
      <Icon name={icon} size="2" />
    </Button>
  )
}

function InsertImageButton() {
  const editor = useSlate()

  function insertImageHandler(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) {
    event.preventDefault()

    let img = image({url: ''}, [text('')])
    Transforms.insertNodes(editor, [text(''), img, text('')])
  }

  return (
    <Tooltip content={<span>Insert Image</span>}>
      <Button
        onClick={insertImageHandler}
        variant="ghost"
        size="0"
        color="muted"
      >
        <Icon name="Image" size="2" />
      </Button>
    </Tooltip>
  )
}

const defaultVirtualEl = {
  getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      top: -9999,
      left: -9999,
      bottom: 20,
      right: 20,
      width: 20,
      height: 20,
    }
  },
  getClientRects() {
    return [this.getBoundingClientRect()]
  },
}

function HoveringToolbar({children}: PropsWithChildren) {
  const editor = useSlate()
  const inFocus = useFocused()

  const {x, y, reference, floating, strategy} = useFloating({
    placement: 'top',
    middleware: [inline(), offset(8), shift(), flip()],
  })

  useEffect(() => {
    const {selection} = editor
    if (
      !selection ||
      !inFocus ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ''
    ) {
      return reference(defaultVirtualEl)
    }
    const domRange = ReactEditor.toDOMRange(editor, selection)
    reference(domRange)
  }, [reference, editor, inFocus, editor.selection])

  return (
    <Box
      ref={floating}
      css={{
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
        zIndex: '$max',
      }}
      onMouseDown={(e) => {
        // prevent toolbar from taking focus away from editor
        e.preventDefault()
      }}
    >
      {children}
    </Box>
  )
}
