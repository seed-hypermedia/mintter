import {Box} from '@components/box'
import {Button} from '@components/button'
import {icons} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {offset, shift, useFloating} from '@floating-ui/react-dom'
import type {Text as MTTText} from '@mintter/mttast'
import {forwardRef, useEffect, useLayoutEffect, useMemo, useState} from 'react'
import {BaseSelection, Editor, Range, Transforms} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {ToolbarLink} from './link'
import {isMarkActive, toggleMark} from './utils'

type FormatTypes = keyof Omit<
  MTTText,
  'type' | 'text' | 'value' | 'data' | 'position'
>

function FormatButton({format}: {format: FormatTypes}) {
  const editor = useSlateStatic()
  const IconComponent = icons[capitalize(format)]
  const markActive = useMemo(
    () => isMarkActive(editor, format),
    [editor, format],
  )

  return (
    <Tooltip content={format}>
      <Button
        css={
          markActive
            ? {
                backgroundColor: '$background-opposite',
                color: '$base-text-hight',
                '&:hover': {
                  backgroundColor: '$background-opposite !important',
                  color: '$base-text-hight !important',
                },
              }
            : {}
        }
        onMouseDown={(event) => {
          event.preventDefault()
          toggleMark(editor, format)
        }}
        variant="ghost"
        size="1"
        color="muted"
      >
        <IconComponent />
      </Button>
    </Tooltip>
  )
}

const Menu = forwardRef<HTMLDivElement, Record<string, any>>(
  ({children, ...props}, ref) => (
    <Box
      {...props}
      ref={ref}
      className="dark-theme MENNUU"
      css={{
        boxShadow: '$menu',
        padding: 0,
        position: 'absolute',
        zIndex: '$max',
        marginTop: '-6px',
        top: 0,
        left: 0,
        opacity: 1,
        backgroundColor: '$base-background-normal',
        borderRadius: '4px',
        transition: 'opacity 0.5s',
        '& > *': {
          display: 'inline-block',
        },
        '& > * + *': {
          marginLeft: 4,
        },
      }}
    >
      {children}
    </Box>
  ),
)

Menu.displayName = 'Menu'

export interface UseLastSelectionResult {
  lastSelection: Range | null
  resetSelection: () => void
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

export function useLastEditorSelection(): UseLastSelectionResult {
  const editor = useSlateStatic()
  const [lastSelection, update] = useState<Range | null>(editor.selection)

  const resetSelection = () => update(null)

  useEffect(() => {
    const setSelection = (newSelection: BaseSelection) => {
      if (!newSelection) return
      if (lastSelection && Range.equals(lastSelection, newSelection)) return
      update(newSelection)
    }

    setSelection(editor.selection)
  }, [editor.selection, lastSelection])

  return {lastSelection, resetSelection}
}
/*
 * @todo handle escape key to remove toolbar
 * @body
 */
export function EditorHoveringToolbar({editor}: {editor: Editor}) {
  const {x, y, reference, floating, strategy} = useFloating({
    placement: 'top',
    middleware: [offset(8), shift()],
  })
  const [storeFocus, sendStoreFocus] = useState(false)
  const {lastSelection, resetSelection} = useLastEditorSelection()

  useLayoutEffect(() => {
    let selection = storeFocus ? lastSelection : editor.selection
    if (
      !selection ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) == ''
    ) {
      reference(defaultVirtualEl)
      return
    }
    const domRange = ReactEditor.toDOMRange(editor, selection)
    reference(domRange)
  }, [reference, editor.selection])

  useEffect(() => {
    const escEvent = (e: KeyboardEvent) => {
      // important to close the toolbar if the escape key is pressed. there's no other way than this apart from calling the `resetSelection`
      if (e.key == 'Escape') {
        Transforms.deselect(editor)
        resetSelection()
      }
    }

    addEventListener('keydown', escEvent)
    return () => {
      removeEventListener('keydown', escEvent)
    }
  }, [resetSelection])

  return (
    <Menu
      ref={floating}
      style={{
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
      }}
    >
      <FormatButton format="strong" />
      <FormatButton format="emphasis" />
      <FormatButton format="underline" />
      {/* <FormatButton format="code" /> */}
      <ToolbarLink
        lastSelection={lastSelection}
        resetSelection={resetSelection}
        sendStoreFocus={sendStoreFocus}
      />
      {/* <ToggleListButton type="orderedList" />
        <ToggleListButton type="unorderedList" /> */}
    </Menu>
  )
}

function capitalize(word: string) {
  return `${word[0].toUpperCase()}${word.slice(1)}`
}
