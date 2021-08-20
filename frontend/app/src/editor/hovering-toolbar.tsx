import ReactDOM from 'react-dom'
import {useState, useMemo, useRef, useEffect, forwardRef} from 'react'
import type {Text as MTTText} from '@mintter/mttast'
import type {BaseEditor} from 'slate'
import {Editor, Transforms, Text, Range} from 'slate'
import {useEditor, ReactEditor} from 'slate-react'
import type {EditorPlugin} from './types'
import {Box} from '@mintter/ui/box'
import {Tooltip} from '../components/tooltip'
import {Button} from '@mintter/ui/button'
import {Icon} from '@mintter/ui/icon'
import {isCollapsed} from './utils'
import {text} from '@mintter/mttast-builder'

export function createHoveringToolbarPlugin(): EditorPlugin {
  // TODO: not working properly, it changed the whole line format and do not respect the current selection. check how udecode is doing it
  // related: https://rawgit.com/w3c/input-events/v1/index.html#interface-InputEvent-Attributes
  return {
    onDOMBeforeInput(event: InputEvent, editor: BaseEditor & ReactEditor) {
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

export function toggleFormat(editor: BaseEditor & ReactEditor, format: FormatTypes) {
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

export function isFormatActive(editor: BaseEditor & ReactEditor, format: FormatTypes) {
  const [match] = Editor.nodes(editor, {
    match: (n) => n[format],
    mode: 'all',
  })
  return !!match
}

const FormatButton = ({format}: {format: FormatTypes}) => {
  const editor = useEditor()
  const iconName = useMemo(() => capitalize(format), [format])
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
        <Icon name={iconName} />
      </Button>
    </Tooltip>
  )
}

const Portal = ({children}) => {
  return typeof document === 'object' ? ReactDOM.createPortal(children, document.body) : null
}

const Menu = forwardRef(({className, ...props}: PropsWithChildren<BaseProps>, ref: Ref<OrNull<HTMLDivElement>>) => (
  <Box
    {...props}
    ref={ref}
    className={className}
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
  />
))

export function HoveringToolbar() {
  const ref = useRef<HTMLDivElement | null>()
  const editor = useEditor()

  useEffect(() => {
    const el = ref.current
    const {selection} = editor

    if (!el) {
      return
    }

    if (
      !selection ||
      !ReactEditor.isFocused(editor) ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ''
    ) {
      el.removeAttribute('style')
      return
    }

    const domSelection = window.getSelection()
    const domRange = domSelection.getRangeAt(0)
    const rect = domRange.getBoundingClientRect()
    el.style.opacity = '1'
    el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`
    el.style.left = `${rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2}px`
  })

  return (
    <Portal>
      <Menu ref={ref}>
        <FormatButton format="strong" />
        <FormatButton format="emphasis" />
        <FormatButton format="underline" />
      </Menu>
    </Portal>
  )
}

function capitalize(word: string): string {
  return `${word[0].toUpperCase()}${word.slice(1)}`
}
