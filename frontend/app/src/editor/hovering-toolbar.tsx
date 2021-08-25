import type {Ref} from 'react'
import type {MTTEditor} from './utils'
import type {EditorPlugin} from './types'
import type {Text as MTTText} from '@mintter/mttast'
import type {BaseSelection} from 'slate'
import ReactDOM from 'react-dom'
import React, {useState, useRef, useEffect, forwardRef} from 'react'
import {Editor, Transforms, Text, Range} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {ToolbarLink} from './elements/link'
import {Box} from '@mintter/ui/box'
import {Tooltip} from '../components/tooltip'
import {Button} from '@mintter/ui/button'
import {icons} from '@mintter/ui/icon'
import {isCollapsed} from './utils'

export const createHoveringToolbarPlugin = (): EditorPlugin => {
  let editor: Editor
  return {
    name: 'hoveringToolbar',
    configureEditor: (e) => (editor = e),
    onBeforeInput(e) {
      const event = e as unknown as InputEvent
      event.preventDefault()
      console.log('onBeforeInput: ', event, editor)
      switch (event.inputType) {
        case 'formatBold':
          event.preventDefault()
          return toggleFormat(editor, 'strong')
        case 'formatItalic':
          event.preventDefault()
          return toggleFormat(editor, 'emphasis')
        case 'formatUnderline':
          console.log('formatUnderline!')
          event.preventDefault()
          return toggleFormat(editor, 'underline')
      }
    },
  }
}

type FormatTypes = keyof Omit<MTTText, 'type' | 'text' | 'value' | 'data' | 'position'>

export function toggleFormat(editor: MTTEditor, format: FormatTypes) {
  const isActive = isFormatActive(editor, format)
  if (isCollapsed(editor.selection)) {
    console.log('toggleFormat: selection collapsed!')
    if (isActive) {
      editor.removeMark(format)
    } else {
      editor.addMark(format, true)
    }

    // Transforms.insertNodes(editor, text('', {[format]: !isActive}))
  } else {
    console.log('toggleFormat: selection is not collapsed!')
    Transforms.setNodes(editor, {[format]: !isActive}, {match: Text.isText, split: true})
  }
}

export function isFormatActive(editor: MTTEditor, format: FormatTypes) {
  const [match] = Editor.nodes(editor, {
    match: (n) => n[format],
    mode: 'all',
  })
  return !!match
}

const FormatButton = ({format}: {format: FormatTypes}) => {
  const editor = useSlateStatic()
  // const iconName: Pick<IconProps, 'name'> = useMemo(() => format && capitalize(format), [format])
  const IconComponent = icons[capitalize(format)]
  return (
    <Tooltip content={format}>
      <Button
        css={
          isFormatActive(editor, format)
            ? {
                backgroundColor: '$background-opposite',
                color: '$text-opposite',
              }
            : {}
        }
        onMouseDown={(event) => {
          console.log('mouse down!', event)
          event.preventDefault()
          toggleFormat(editor, format)
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
  const [lastSelection, update] = useState<BaseSelection>(editor.selection)

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
  const {lastSelection, resetSelection} = useLastEditorSelection()

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }

    if (!lastSelection || Range.isCollapsed(lastSelection) || Editor.string(editor, lastSelection) == '') {
      el.removeAttribute('style')
      return
    }
    const domRange = ReactEditor.toDOMRange(editor, lastSelection)
    const rect = domRange.getBoundingClientRect()
    el.style.opacity = '1'
    el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`
    el.style.left = `${rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2}px`
  })

  useEffect(() => {
    const escEvent = (e: KeyboardEvent) => {
      // important to close the toolbar if the escape key is pressed. there's no other way than this apart from calling the `resetSelection`
      if (e.key == 'Escape') {
        console.log('lastSelection', lastSelection, editor.selection)
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
        <ToolbarLink lastSelection={lastSelection} resetSelection={resetSelection} />
      </Menu>
    </Portal>
  )
}

function capitalize(word: string) {
  return `${word[0].toUpperCase()}${word.slice(1)}`
}
