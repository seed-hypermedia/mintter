import {
  isFlowContent,
  isGroupContent,
  isOrderedList,
  isParagraph,
  isStatement,
  ol,
  ul,
} from '@app/mttast'

import {Editor, Range, Transforms} from 'slate'
import {ELEMENT_CODE} from './code'
import {ELEMENT_ORDERED_LIST, ELEMENT_UNORDERED_LIST} from './group'
import {ELEMENT_HEADING} from './heading'
import {ELEMENT_STATIC_PARAGRAPH} from './static-paragraph'
import type {EditorPlugin} from './types'
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

        const path = block ? block[1] : []
        const start = Editor.start(editor, path)
        const range = {anchor, focus: start}
        const beforeText = Editor.string(editor, range)

        // turn Group into UnorderedList
        if (['-', '*', '+'].includes(beforeText)) {
          const [above, abovePath] =
            Editor.above(editor, {
              match: isFlowContent,
              // mode: 'lowest',
            }) || []

          if (above && abovePath) {
            if (isFirstChild(abovePath)) {
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)
                Transforms.setNodes(
                  editor,
                  {type: ELEMENT_UNORDERED_LIST},
                  {match: isGroupContent},
                )
              })
              return
            } else {
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)

                const [prev, prevPath] =
                  Editor.previous(editor, {at: abovePath}) || []

                if (!prev || !prevPath) throw new Error('bug')

                if (isGroupContent(prev.children[1])) {
                  Transforms.moveNodes(editor, {
                    at: abovePath,
                    to: prevPath.concat(1, prev.children[1].children.length),
                  })
                } else {
                  Transforms.wrapNodes(editor, ul([]), {
                    at: abovePath,
                  })
                  Transforms.moveNodes(editor, {
                    at: abovePath,
                    to: prevPath.concat(1),
                  })
                }
              })
              return
            }
          }
        }

        // turn Group into OrderedList
        if (/^\d+\./.test(beforeText)) {
          const [above, abovePath] =
            Editor.above(editor, {
              match: isStatement,
              mode: 'lowest',
            }) || []

          if (above && abovePath) {
            if (isFirstChild(abovePath)) {
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)

                const start = parseInt(beforeText)

                Transforms.setNodes(
                  editor,
                  {type: ELEMENT_ORDERED_LIST, start},
                  {match: isGroupContent},
                )
              })
              return
            } else {
              Editor.withoutNormalizing(editor, () => {
                Transforms.select(editor, range)
                Transforms.delete(editor)

                const start = parseInt(beforeText)

                const [prev, prevPath] =
                  Editor.previous(editor, {at: abovePath}) || []

                if (!prev || !prevPath) throw new Error('bug')

                if (isGroupContent(prev.children[1])) {
                  Transforms.moveNodes(editor, {
                    at: abovePath,
                    to: prevPath.concat(1, prev.children[1].children.length),
                  })
                } else {
                  Transforms.wrapNodes(editor, ol({start}, []), {
                    at: abovePath,
                  })
                  Transforms.moveNodes(editor, {
                    at: abovePath,
                    to: prevPath.concat(1),
                  })
                }
              })
              return
            }
          }
        }

        // turn Statement into Heading
        if (beforeText === '#') {
          const above = Editor.above(editor, {
            match: isStatement,
            mode: 'lowest',
          })

          if (above && !isOrderedList(above[1])) {
            Editor.withoutNormalizing(editor, () => {
              Transforms.select(editor, range)
              Transforms.delete(editor)
              Transforms.setNodes(
                editor,
                {type: ELEMENT_HEADING},
                {match: isStatement},
              )
              Transforms.setNodes(
                editor,
                {type: ELEMENT_STATIC_PARAGRAPH},
                {match: isParagraph},
              )
            })
            return
          }
        }

        // turn Statement into Codeblock
        if (beforeText === '```') {
          const above = Editor.above(editor, {
            match: isStatement,
            mode: 'lowest',
          })

          if (above) {
            Editor.withoutNormalizing(editor, () => {
              Transforms.select(editor, range)
              Transforms.delete(editor)
              Transforms.setNodes(
                editor,
                {type: ELEMENT_CODE},
                {match: isStatement},
              )
            })
            return
          }
        }
      }

      if (text == '`' && selection && Range.isCollapsed(selection)) {
        const {anchor} = selection
        const block = Editor.above(editor, {
          match: (n) => Editor.isBlock(editor, n),
        })

        const path = block ? block[1] : []
        const start = Editor.start(editor, path)
        const range = {anchor, focus: start}
        const beforeText = Editor.string(editor, range)

        // turn Statement into Codeblock
        if (beforeText === '``') {
          const above = Editor.above(editor, {
            match: isStatement,
            mode: 'lowest',
          })

          if (above) {
            Editor.withoutNormalizing(editor, () => {
              Transforms.select(editor, range)
              Transforms.delete(editor)
              Transforms.setNodes(
                editor,
                {type: ELEMENT_CODE},
                {match: isStatement},
              )
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
