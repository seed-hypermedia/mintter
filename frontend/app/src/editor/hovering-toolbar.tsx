import {image, text} from '@app/mttast'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {offset, shift, useFloating} from '@floating-ui/react-dom'
import {PropsWithChildren, useEffect} from 'react'
import {Editor, Range, Transforms} from 'slate'
import {ReactEditor, useFocused, useSlate} from 'slate-react'
import {MARK_EMPHASIS} from './emphasis'
import {MARK_CODE} from './inline-code'
import {InsertLinkButton} from './link'
import {MARK_STRONG} from './strong'
import {MARK_UNDERLINE} from './underline'
import {isFormatActive, toggleFormat} from './utils'

export function EditorHoveringToolbar() {
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
        <InsertLinkButton />
        <InsertImageButton />
      </Box>
    </HoveringToolbar>
  )
}

export function PublicationHoveringToolbar() {
  return <HoveringToolbar>copy reference</HoveringToolbar>
}

function FormatButton({
  format,
  icon,
}: {
  format: string
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
              backgroundColor: '$base-text-high',
              color: '$base-text-hight',
              '&:hover': {
                backgroundColor: '$base-text-high !important',
                color: '$base-text-hight !important',
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
}

function HoveringToolbar({children}: PropsWithChildren) {
  const editor = useSlate()
  const inFocus = useFocused()

  const {x, y, reference, floating, strategy} = useFloating({
    placement: 'top',
    middleware: [offset(8), shift()],
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
  }, [reference, editor, inFocus])

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
