import { ELEMENT_HEADING } from '@app/editor/heading'
import { changesService } from '@app/editor/mintter-changes/plugin'
import { ELEMENT_STATIC_PARAGRAPH } from '@app/editor/static-paragraph'
import { isFlowContent, isGroupContent, isOrderedList, isParagraph, isStatement, ol, ul } from '@mintter/mttast'
import { Editor, Path, Range, Transforms } from 'slate'
import { ELEMENT_ORDERED_LIST } from './ordered-list'
import type { EditorPlugin } from './types'
import { ELEMENT_UNORDERED_LIST } from './unordered-list'
import { isFirstChild } from './utils'

export const createMarkdownShortcutsPlugin = (): EditorPlugin => ({
  name: 'markdown shortcuts',
  configureEditor(editor) {
    const { insertText } = editor

    editor.insertText = (text) => {
      const { selection } = editor

      if (text == ' ' && selection && Range.isCollapsed(selection)) {
        const { anchor } = selection
        const block = Editor.above(editor, {
          match: (n) => Editor.isBlock(editor, n),
        })

        const path = block ? block[1] : []
        const start = Editor.start(editor, path)
        let range = { anchor, focus: start }
        const beforeText = Editor.string(editor, range)
        console.log("🚀 ~ file: markdown-plugin.ts ~ line 28 ~ configureEditor ~ start", { start, range, beforeText, path, anchor, selection })

        // turn Group into UnorderedList
        if (['-', '*', '+'].includes(beforeText)) {
          const above = Editor.above(editor, { match: isStatement, mode: 'lowest' })

          if (above) {
            let aboveParent = Editor.above(editor, {
              match: isFlowContent,
              at: path
            })
            if (aboveParent) {
              let [aboveParentBlock] = aboveParent
              changesService.addChange(['replaceBlock', aboveParentBlock.id])
            }
            if (isFirstChild(above[1])) {
              // block is the first one on a nested list, we just transform the list into a ul
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)
                Transforms.setNodes(editor, { type: ELEMENT_UNORDERED_LIST }, { match: isGroupContent })
              })

              return
            } else {
              // wrap the current statement in a ul and move it to it's left sibling block as child
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)
                Transforms.wrapNodes(editor, ul([]), { at: above[1], match: isStatement })
                Transforms.moveNodes(editor, { at: above[1], to: Path.previous(above[1]).concat(1) })
                changesService.addChange(['moveBlock', above[0].id])
              })
              return
            }
          }
        }

        // turn Group into OrderedList
        if (/\d\./.test(beforeText)) {
          const above = Editor.above(editor, { match: isStatement, mode: 'lowest' })

          if (above) {
            let aboveParent = Editor.above(editor, {
              match: isFlowContent,
              at: path
            })
            if (aboveParent) {
              let [aboveParentBlock] = aboveParent
              changesService.addChange(['replaceBlock', aboveParentBlock.id])
            }

            if (isFirstChild(above[1])) {
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)

                const start = parseInt(beforeText)

                Transforms.setNodes(editor, { type: ELEMENT_ORDERED_LIST, start }, { match: isGroupContent })
              })
              return
            } else {
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)

                const start = parseInt(beforeText)

                Transforms.wrapNodes(editor, ol({ start }, []), { at: above[1], match: isStatement })
                Transforms.moveNodes(editor, { at: above[1], to: Path.previous(above[1]).concat(1) })
                changesService.addChange(['moveBlock', above[0].id])
              })
              return
            }
          }
        }

        // turn statement into
        if (beforeText === '#') {
          const above = Editor.above(editor, { match: isStatement, mode: 'lowest' })

          if (above && !isOrderedList(above[1])) {
            Editor.withoutNormalizing(editor, () => {
              Transforms.select(editor, range)
              Transforms.delete(editor)
              Transforms.setNodes(editor, { type: ELEMENT_HEADING }, { match: isStatement })
              Transforms.setNodes(editor, { type: ELEMENT_STATIC_PARAGRAPH }, { match: isParagraph })
              changesService.addChange(['replaceBlock', above[0].id])
            })
            return
          }
        }
      }
      insertText(text)
    }

    return editor
  },
})
