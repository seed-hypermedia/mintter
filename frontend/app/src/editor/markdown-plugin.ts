import {isGroupContent, isOrderedList, isParagraph, isStatement} from '@mintter/mttast'
import {ol, ul} from '@mintter/mttast-builder'
import {Editor, Path, Range, Transforms} from 'slate'
import {ELEMENT_HEADING} from './heading'
import {ELEMENT_ORDERED_LIST} from './ordered-list'
import {ELEMENT_STATIC_PARAGRAPH} from './static-paragraph'
import type {EditorPlugin} from './types'
import {ELEMENT_UNORDERED_LIST} from './unordered-list'
import {isFirstChild} from './utils'

export const createMarkdownShortcutsPlugin = (): EditorPlugin => ({
  name: 'markdown shortcuts',
  configureEditor(editor) {
    const {insertText} = editor

    editor.insertText = (text) => {
      const {selection} = editor

      if (text == ' ' && selection && Range.isCollapsed(selection)) {
        const {anchor} = selection
        const block = Editor.above(editor, {
          match: (n) => Editor.isBlock(editor, n),
        })
        console.log('🚀 ~ file: markdown-plugin.ts ~ line 22 ~ configureEditor ~ block', block)
        const path = block ? block[1] : []
        const start = Editor.start(editor, path)
        const range = {anchor, focus: start}
        const beforeText = Editor.string(editor, range)

        // turn Group into UnorderedList
        if (['-', '*', '+'].includes(beforeText)) {
          const above = Editor.above(editor, {match: isStatement, mode: 'lowest'})

          if (above) {
            if (isFirstChild(above[1])) {
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)
                Transforms.setNodes(editor, {type: ELEMENT_UNORDERED_LIST}, {match: isGroupContent})
              })
              return
            } else {
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)
                Transforms.wrapNodes(editor, ul([]), {at: above[1], match: isStatement})
                Transforms.moveNodes(editor, {at: above[1], to: Path.previous(above[1]).concat(1)})
              })
              return
            }
          }
        }

        // turn Group into OrderedList
        if (/\d\./.test(beforeText)) {
          const above = Editor.above(editor, {match: isStatement, mode: 'lowest'})

          if (above) {
            if (isFirstChild(above[1])) {
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)

                const start = parseInt(beforeText)

                Transforms.setNodes(editor, {type: ELEMENT_ORDERED_LIST, start}, {match: isGroupContent})
              })
              return
            } else {
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)

                const start = parseInt(beforeText)

                Transforms.wrapNodes(editor, ol({start}, []), {at: above[1], match: isStatement})
                Transforms.moveNodes(editor, {at: above[1], to: Path.previous(above[1]).concat(1)})
              })
              return
            }
          }
        }

        // turn statement into
        if (beforeText === '#') {
          const above = Editor.above(editor, {match: isStatement, mode: 'lowest'})

          if (above && !isOrderedList(above[1])) {
            Editor.withoutNormalizing(editor, () => {
              Transforms.select(editor, range)
              Transforms.delete(editor)
              Transforms.setNodes(editor, {type: ELEMENT_HEADING}, {match: isStatement})
              Transforms.setNodes(editor, {type: ELEMENT_STATIC_PARAGRAPH}, {match: isParagraph})
            })
          }
        }
      }
      insertText(text)
    }

    return editor
  },
})
