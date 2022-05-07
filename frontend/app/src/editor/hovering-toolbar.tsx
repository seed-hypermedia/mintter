import {Box} from '@components/box'
import {Button} from '@components/button'
import {icons} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import type {Text as MTTText} from '@mintter/mttast'
import React, {
  forwardRef,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from 'react'
import ReactDOM from 'react-dom'
import type {BaseSelection} from 'slate'
import {Editor, Range, Transforms} from 'slate'
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
  return (
    <Tooltip content={format}>
      <Button
        css={
          isMarkActive(editor, format)
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

const Portal = ({children}: PropsWithChildren<unknown>) => {
  return typeof document == 'object'
    ? ReactDOM.createPortal(children, document.body)
    : null
}

const Menu = forwardRef<HTMLDivElement, Record<string, unknown>>(
  ({children, ...props}, ref) => (
    <Box
      {...props}
      ref={ref}
      className="dark-theme"
      css={{
        boxShadow: '$menu',
        padding: 0,
        position: 'absolute',
        zIndex: '$max',
        top: '-1000000000px',
        left: '-1000000000px',
        marginTop: '-6px',
        opacity: 0,
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
export function HoveringToolbar() {
  const ref = useRef<HTMLDivElement | null>()
  const editor = useSlateStatic()
  const [storeFocus, sendStoreFocus] = useState(false)
  const {lastSelection, resetSelection} = useLastEditorSelection()

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }

    let selection = storeFocus ? lastSelection : editor.selection

    if (
      !selection ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) == ''
    ) {
      el.removeAttribute('style')
      return
    }

    const domRange = ReactEditor.toDOMRange(editor, selection)
    const rect = domRange.getBoundingClientRect()
    el.style.opacity = '1'
    el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`
    el.style.left = `${
      rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2
    }px`
  })

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
    <Portal>
      <Menu ref={ref}>
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
    </Portal>
  )
}

function capitalize(word: string) {
  return `${word[0].toUpperCase()}${word.slice(1)}`
}
