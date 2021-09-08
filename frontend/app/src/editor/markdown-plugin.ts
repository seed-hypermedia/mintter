import {isGroupContent, isOrderedList, isStatement, isUnorderedList} from '@mintter/mttast'
import {Range, Editor, Transforms} from 'slate'
import {ELEMENT_HEADING} from './elements/heading'
import {ELEMENT_ORDERED_LIST} from './elements/ordered-list'
import {ELEMENT_UNORDERED_LIST} from './elements/unordered-list'
import type {EditorPlugin} from './types'

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
        const path = block ? block[1] : []
        const start = Editor.start(editor, path)
        const range = {anchor, focus: start}
        const beforeText = Editor.string(editor, range)

        // turn Group into UnorderedList
        if (['-', '*', '+'].includes(beforeText)) {
          const above = Editor.above(editor, {match: isGroupContent, mode: 'lowest'})

          if (above && !isUnorderedList(above[1])) {
            Transforms.select(editor, range)
            Transforms.delete(editor)
            Transforms.setNodes(editor, {type: ELEMENT_UNORDERED_LIST}, {match: isGroupContent})
            return
          }
        }

        // turn Group into OrderedList
        if (/\d\./.test(beforeText)) {
          const above = Editor.above(editor, {match: isGroupContent, mode: 'lowest'})

          if (above && !isOrderedList(above[1])) {
            Transforms.select(editor, range)
            Transforms.delete(editor)

            const start = parseInt(beforeText)

            Transforms.setNodes(editor, {type: ELEMENT_ORDERED_LIST, start}, {match: isGroupContent})
            return
          }
        }

        // // turn statement into
        // if (beforeText == '#') {
        //   const above = Editor.above(editor, {match: isStatement, mode: 'lowest'})

        //   if (above && !isOrderedList(above[1])) {
        //     Transforms.select(editor, range)
        //     Transforms.delete(editor)
        //     Transforms.setNodes(editor, {type: ELEMENT_HEADING}, {match: isStatement})
        //   }
        // }
        // insertText(text)
      }
      insertText(text)
    }

    return editor
  },
})
