import {error} from '@app/utils/logger'
import {
  isFlowContent,
  isImage,
  isPhrasingContent,
  sanitizeSchema,
  toMttast,
} from '@mintter/mttast'
import rehypeParse from 'rehype-parse'
import sanitize from 'rehype-sanitize'
import {Editor, Transforms} from 'slate'
import {unified} from 'unified'
import {Parent} from 'unist'
import {visit} from 'unist-util-visit'
import {EditorPlugin} from './types'

const processor = unified()
  .use(rehypeParse)
  .use(sanitize, sanitizeSchema)
  .freeze()

export function createPlainTextPastePlugin(): EditorPlugin {
  return {
    name: 'PastePlainTextPlugin',
    configureEditor(editor) {
      if (editor.readOnly) return
      const {insertData} = editor

      editor.insertData = (transfer: DataTransfer) => {
        /**
         * TODO:
         * would be nice to catch the slate-fragment content here
         */

        // var html = data.getData('text/html')

        // if (html) {
        //   let hast = processor.runSync(processor.parse(html))
        //   debug('HAST:', hast)
        //   let mttast = toMttast(hast)
        //   debug('MTTAST:', mttast)
        //   let fragment = removeEmptyText(mttast)

        //   debug('paste mttast', fragment)
        //   let [parentBlock, parentPath] =
        //     Editor.above(editor, {match: isFlowContent}) || []
        //   if (parentBlock && parentPath) {
        //     debug('parent block:', parentBlock)
        //     Editor.withoutNormalizing(editor, () => {
        //       /**
        //        * we are inserting nodes here because this will push the current block below what we are pasting
        //        * check the difference between insertFragment and insertNodes here:

        //        * https://slate-explorer.glitch.me/#eyJpbnB1dCI6IjxlZGl0b3I+XG4gIDx1bD5cbiAgICA8bGk+Zm9vPGN1cnNvci8+PC9saT5cbiAgPC91bD5cbjwvZWRpdG9yPiIsInNsYXRlIjpbeyJ0eXBlIjoidWwiLCJjaGlsZHJlbiI6W3sidHlwZSI6ImxpIiwiY2hpbGRyZW4iOlt7InRleHQiOiJmb28ifV19XX1dLCJ0cmFuc2Zvcm0iOiJjb25zdCBub2RlcyA9IFtcbiAgeyB0eXBlOiAndWwnLCBjaGlsZHJlbjogW1xuICAgIHsgdHlwZTogJ2xpJywgY2hpbGRyZW46IFtcbiAgICAgIHsgdGV4dDogJ2JhcicgfVxuICAgIF0gfVxuICBdIH1cbl1cbi8vIFRyYW5zZm9ybXMuaW5zZXJ0RnJhZ21lbnQoZWRpdG9yLCBub2RlcylcblRyYW5zZm9ybXMuaW5zZXJ0Tm9kZXMoZWRpdG9yLCBub2RlcylcbiIsInNob3dIZWxwIjpmYWxzZX0=
        //        */
        //       Transforms.insertNodes(editor, fragment.children, {
        //         at: parentPath,
        //       })
        //     })
        //   } else {
        //     error('Paste Plugin: No block found above', editor.selection)
        //   }

        //   // Transforms.insertFragment(editor, mttast.children, {at: [0, 0]})

        //   return
        // }

        // var text = data.getData('text/plain')

        // if (text) {
        //   var lines = text
        //     .split(/\r\n|\r|\n/)
        //     .filter((l) => l != '')
        //     .join('\n')

        //   var newData = new DataTransfer()
        //   newData.setData('text/plain', lines)
        //   insertData(newData)
        //   return
        // }

        const html = transfer.getData('text/html')

        if (html) {
          const hast = processor.runSync(processor.parse(html))
          const mttast = toMttast(hast)
          const fragment = removeEmptyText(mttast)

          // insert inline content directly instead
          if (fragment.children.every(isPhrasingContent)) {
            return Transforms.insertNodes(editor, fragment.children)
          }

          const [parentBlock, parentPath] =
            Editor.above(editor, {match: isFlowContent}) || []
          if (parentBlock && parentPath) {
            Transforms.insertNodes(editor, fragment.children, {
              at: parentPath,
            })
            return
          } else {
            error('Paste Plugin: No block found above', editor.selection)
          }
        }
        insertData(transfer)
      }

      return editor
    },
  }
}

function removeEmptyText(tree: Parent) {
  console.log('removeEmptyText INIT')

  visit(tree, 'text', (node: any, index: any, parent: any) => {
    if (node.value === '') {
      if (!isImage(parent)) {
        parent.children.splice(index, 1, ...node.children)
      }
    }
  })

  return tree
}
