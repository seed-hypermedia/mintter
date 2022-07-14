import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {offset, shift, useFloating} from '@floating-ui/react-dom'
import {image, text} from '@mintter/mttast'
import {PropsWithChildren, useEffect} from 'react'
import {Editor, Range, Transforms} from 'slate'
import {ReactEditor, useFocused, useSlate} from 'slate-react'
import {MARK_EMPHASIS} from './emphasis'
import {MARK_CODE} from './inline-code'
import {MARK_STRONG} from './strong'
import {MARK_UNDERLINE} from './underline'
import {isFormatActive, toggleFormat} from './utils'

export function EditorHoveringToolbar() {
  const editor = useSlate()

  return (
    <HoveringToolbar>
      <Menu>
        <FormatButton format={MARK_STRONG} icon="Strong" />
        <FormatButton format={MARK_EMPHASIS} icon="Emphasis" />
        <FormatButton format={MARK_UNDERLINE} icon="Underline" />
        <FormatButton format={MARK_CODE} icon="Code" />
        <Tooltip content={<span>Image</span>}>
          <Button
            onClick={insertImageHandler(editor)}
            variant="ghost"
            size="0"
            color="muted"
          >
            <Icon name="Image" size="2" />
          </Button>
        </Tooltip>
      </Menu>
    </HoveringToolbar>
  )
}

function insertImageHandler(editor: Editor) {
  return function imageClickEvent(event: MouseEvent) {
    event.preventDefault()
    insertImage(editor)
  }
}

function insertImage(editor: Editor, url = '') {
  let img = image({url}, [text('')])
  Transforms.insertNodes(editor, [text(''), img, text('')])
}

export function PublicationHoveringToolbar() {
  return <HoveringToolbar>copy reference</HoveringToolbar>
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
  // const ref = useRef<HTMLDivElement | null>(null)

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
      // el.style.opacity = '0'
      // el.style.top = '-10000px'
      // el.style.left = '-10000px'
      return reference(defaultVirtualEl)
    }

    // const domSelection = window.getSelection()
    // const domRange =
    //   domSelection && domSelection?.rangeCount > 0
    //     ? domSelection?.getRangeAt(0)
    //     : null
    // const rect = domRange?.getBoundingClientRect()

    // if (!rect) {
    //   return
    // }

    // el.style.opacity = '1'
    // el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight - 110}px`
    // el.style.left = `${
    //   rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2
    // }px`

    const domRange = ReactEditor.toDOMRange(editor, selection)
    reference(domRange)
  }, [reference, editor.selection, inFocus])

  return (
    <div
      ref={floating}
      style={{
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
        zIndex: '1',
      }}
      // style={{
      //   position: 'absolute',
      //
      //   top: '-10000px',
      //   left: '-10000px',
      //   opacity: 0,
      // }}
      onMouseDown={(e) => {
        // prevent toolbar from taking focus away from editor
        e.preventDefault()
      }}
    >
      {children}
    </div>
  )
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

function Menu({children}: PropsWithChildren) {
  return (
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
      {children}
    </Box>
  )
}
