import {
  isFlowContent,
  isImage,
  isPhrasingContent,
  MttRoot,
  sanitizeSchema,
  toMttast,
} from '@mintter/shared'
import { isMintterLink } from '@app/utils/is-mintter-link'
import { error } from '@app/utils/logger'
import rehypeParse from 'rehype-parse'
import sanitize from 'rehype-sanitize'
import { Editor, Transforms } from 'slate'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { EditorPlugin } from './types'

const processor = unified().use(rehypeParse).use(sanitize, sanitizeSchema).freeze()

export function createPlainTextPastePlugin(): EditorPlugin {
  return {
    name: 'PastePlainTextPlugin',
    configureEditor(editor) {
      if (editor.readOnly) return
      const { insertData } = editor

      editor.insertData = (transfer: DataTransfer) => {
        /**
         * TODO:
         * would be nice to catch the slate-fragment content here
         */

        const html = transfer.getData('text/html')

        if (html) {
          const hast = processor.runSync(processor.parse(html))
          //@ts-ignore
          window.hast = hast
          const mttast = toMttast(hast)
          const fragment = removeEmptyText(mttast)

          // insert inline content directly instead
          if (fragment.children.every(isPhrasingContent)) {
            return Transforms.insertNodes(editor, fragment.children)
          }

          const [parentBlock, parentPath] = Editor.above(editor, { match: isFlowContent }) || []
          if (parentBlock && parentPath) {
            Transforms.insertNodes(editor, fragment.children, {
              at: parentPath,
            })
            return
          } else {
            error('Paste Plugin: No block found above', editor.selection)
          }
        }

        const text = transfer.getData('text/plain')

        if (text) {
          if (!isMintterLink(text)) {
            const normalized = text.split(/\r\n|\r|\n/).join('\n')

            editor.insertText(normalized)
            return
          }
        }

        insertData(transfer)
      }

      return editor
    },
  }
}

function removeEmptyText(tree: MttRoot) {
  visit(tree, 'text', (node, index, parent) => {
    if (node.text === '') {
      if (!isImage(parent)) {
        //@ts-ignore
        parent!.children.splice(index!, 1, ...node.children)
      }
    }
  })

  return tree
}
