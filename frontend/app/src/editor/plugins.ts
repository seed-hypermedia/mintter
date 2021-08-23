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
import {createBlockquotePlugin} from './elements/blockquote'
import {createEmbedPlugin} from './elements/embed'
import {createCodeBlockPlugin} from './elements/code-block'
import { createTabPlugin } from './tab-plugin'

export const plugins: Array<EditorPlugin> = [
  createHoveringToolbarPlugin(),

  createStrongPlugin(),
  createEmphasisPlugin(),
  createUnderlinePlugin(),
  createStrikethroughPlugin(),
  createSuperscriptPlugin(),
  createSubscriptPlugin(),

  createLinkPlugin(),
  createEmbedPlugin(),

  createStaticParagraphPlugin(),
  createParagraphPlugin(),

  createHeadingPlugin(),
  createStatementPlugin(),

  createBlockquotePlugin(),
  createCodeBlockPlugin(),
 
  createGroupPlugin(),
  createUnorderedListPlugin(),
  createOrderedListPlugin(),

  createTabPlugin(),
  {
    name: 'normalize',
    configureEditor(editor) {
      const {normalizeNode} = editor

      editor.normalizeNode = (entry) => {
        const [node, path] = entry
        console.log(path, node.type, node.id, node)
        normalizeNode(entry)
      }
      return editor
    },
  },
]
