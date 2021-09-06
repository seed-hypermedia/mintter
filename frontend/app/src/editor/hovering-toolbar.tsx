import type {Ref} from 'react'
import type {Text as MTTText} from '@mintter/mttast'
import type {BaseSelection} from 'slate'
import ReactDOM from 'react-dom'
import React, {useState, useRef, useEffect, forwardRef} from 'react'
import {Editor, Transforms, Range} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {ToolbarLink} from './elements/link'
import {Box} from '@mintter/ui/box'
import {Tooltip} from '../components/tooltip'
import {Button} from '@mintter/ui/button'
import {Icon, icons} from '@mintter/ui/icon'
import {toggleMark, isMarkActive} from './utils'
import {ELEMENT_UNORDERED_LIST} from './elements/unordered-list'
import {ELEMENT_ORDERED_LIST} from './elements/ordered-list'

type FormatTypes = keyof Omit<MTTText, 'type' | 'text' | 'value' | 'data' | 'position'>

function FormatButton({format}: {format: FormatTypes}) {
  const editor = useSlateStatic()
  // const iconName: Pick<IconProps, 'name'> = useMemo(() => format && capitalize(format), [format])
  const IconComponent = icons[capitalize(format)]
  return (
    <Tooltip content={format}>
      <Button
        css={
          isMarkActive(editor, format)
            ? {
                backgroundColor: '$background-opposite',
                color: '$text-opposite',
              }
            : {}
        }
        onMouseDown={(event) => {
          console.log('mouse down!', event)

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

const Portal = ({children}: {children: React.ReactChildren}) => {
  return typeof document == 'object' ? ReactDOM.createPortal(children, document.body) : null
}

const Menu = forwardRef(({children, ...props}, ref: Ref<HTMLDivElement>) => (
  <Box
    {...props}
    ref={ref}
    css={{
      padding: '8px 7px 6px',
      position: 'absolute',
      zIndex: 1,
      top: '-1000000000px',
      left: '-1000000000px',
      marginTop: '-6px',
      opacity: 0,
      backgroundColor: 'black',
      borderRadius: '4px',
      transition: 'opacity 0.5s',
      '& > *': {
        display: 'inline-block',
      },
      '& > * + *': {
        marginLeft: 15,
      },
    }}
  >
    {children}
  </Box>
))

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

    if (!selection || Range.isCollapsed(selection) || Editor.string(editor, selection) == '') {
      el.removeAttribute('style')
      return
    }
    const domRange = ReactEditor.toDOMRange(editor, selection)
    const rect = domRange.getBoundingClientRect()
    el.style.opacity = '1'
    el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`
    el.style.left = `${rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2}px`
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
  }, [])

  return (
    <Portal>
      {/*
      /*
       * @todo fix types on Menu component.
       * @body Children complains about something... 
       * @ts-ignore */}
      <Menu ref={ref}>
        <FormatButton format="strong" />
        <FormatButton format="emphasis" />
        <FormatButton format="underline" />
        <ToolbarLink lastSelection={lastSelection} resetSelection={resetSelection} sendStoreFocus={sendStoreFocus} />
        {/* <ToggleListButton type="orderedList" />
        <ToggleListButton type="unorderedList" /> */}
      </Menu>
    </Portal>
  )
}

function capitalize(word: string) {
  return `${word[0].toUpperCase()}${word.slice(1)}`
}

const listFormatLabel = {
  [ELEMENT_UNORDERED_LIST]: 'Unordered List (ul)',
  [ELEMENT_ORDERED_LIST]: 'Ordered List (ol)',
}

function ToggleListButton({type}: {type: 'orderedList' | 'unorderedList'}) {
  const editor = useSlateStatic()
  return (
    <Tooltip content={type}>
      {/* <Button
        css={
          isMarkActive(editor, format)
            ? {
                backgroundColor: '$background-opposite',
                color: '$text-opposite',
              }
            : {}
        }
        onMouseDown={(event) => {
          console.log('mouse down!', event)

          event.preventDefault()
          toggleMark(editor, format)
        }}
        variant="ghost"
        size="1"
        color="muted"
      ></Button> */}
    </Tooltip>
  )
}
