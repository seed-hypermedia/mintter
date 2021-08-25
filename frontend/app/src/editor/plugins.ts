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
import {createTabPlugin} from './tab-plugin'
import {createMDHighlightPlugin} from './md-highlight'

export const plugins: Array<EditorPlugin | Promise<EditorPlugin>> = [
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
  /*
   * @todo Missing plugins
   * @body insert html, insert markdown
   */

  createTabPlugin(),
  createMDHighlightPlugin(),
  {
    name: 'normalize',
    configureEditor(editor) {
      const {normalizeNode} = editor

      // editor.insertText = (text) => {
      //   const {selection} = editor
      //   if (selection && isCollapsed(selection)) {
      //     const parent = Editor.parent(editor, selection.anchor.path)
      //     if (parent) {
      //       const [parentNode, parentPath] = parent
      //       if (isContent(parentNode) || isStaticContent(parentNode)) {
      //         if (parentNode.children.length > 1) {
      //           for (const [child, childPath] of Node.children(parent)) {
      //             if (Path.hasPrevious(childPath)) {
      //               // const prev = Node.
      //             }
      //           }
      //         }
      //       }
      //     }
      //   }
      //   insertText(text)
      // }

      editor.normalizeNode = (entry) => {
        const [node, path] = entry
        console.log(path, node.type, node.id, node)
        normalizeNode(entry)
      }
      return editor
    },
  },
]
