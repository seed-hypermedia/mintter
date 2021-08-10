import {createGroupPlugin} from './elements/group'
import {createOrderedListPlugin} from './elements/ordered-list'
import {createParagraphPlugin} from './elements/paragraph'
import {createHeadingPlugin} from './elements/heading'
import {createStatementPlugin} from './elements/statement'
import {createStaticParagraphPlugin} from './elements/static-paragraph'
import {createUnorderedListPlugin} from './elements/unordered-list'
import {createLinkPlugin} from './elements/link'
import type {EditorPlugin} from './types'
import {createStrongPlugin} from './leafs/strong'
import {createEmphasisPlugin} from './leafs/emphasis'
import {createUnderlinePlugin} from './leafs/underline'
import {createStrikethroughPlugin} from './leafs/strikethrough'
import {createSuperscriptPlugin} from './leafs/superscript'
import {createSubscriptPlugin} from './leafs/subscript'
import {createHoveringToolbarPlugin} from './hovering-toolbar'
import {Node, Transforms} from 'slate'

export const plugins: Array<EditorPlugin> = [
  createHoveringToolbarPlugin(),
  createTextPlugin(),
  createStrongPlugin(),
  createEmphasisPlugin(),
  createUnderlinePlugin(),
  createStrikethroughPlugin(),
  createSuperscriptPlugin(),
  createSubscriptPlugin(),

  createLinkPlugin(),

  createStaticParagraphPlugin(),
  createParagraphPlugin(),

  createStatementPlugin(),
  createHeadingPlugin(),

  createGroupPlugin(),
  createUnorderedListPlugin(),
  createOrderedListPlugin(),
]

function createTextPlugin(): EditorPlugin {
  return {
    configureEditor(editor) {
      const {apply} = editor

      editor.apply = (operation) => {
        const {type} = operation
        const {selection} = editor
        if (type == 'insert_text') {
          const node = Node.get(editor, selection?.anchor.path)
          console.log('🚀 ~ node', node)
          Transforms.setNodes(editor, {text: node.value + operation.text})
        }
        apply(operation)
      }

      return editor
    },
  }
}

export * from './editor'
export * from './use-editor-draft'
