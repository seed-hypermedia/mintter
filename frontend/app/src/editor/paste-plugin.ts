import {sanitizeSchema, toMttast} from '@mintter/mttast'
import rehypeParse from 'rehype-parse'
import sanitize from 'rehype-sanitize'
import {Transforms} from 'slate'
import {unified} from 'unified'
import {visit} from 'unist-util-visit'
import {EditorPlugin} from './types'

var processor = unified()
  .use(rehypeParse)
  .use(sanitize, sanitizeSchema)
  .freeze()

export function createPlainTextPastePlugin(): EditorPlugin {
  return {
    name: 'PastePlainTextPlugin',
    configureEditor(editor) {
      if (editor.readOnly) return
      var {insertData} = editor

      editor.insertData = customInsertData

      async function customInsertData(data: DataTransfer) {
        var html = data.getData('text/html')

        if (html) {
          let hast = processor.runSync(processor.parse(html))
          let mttast = removeEmptyText(toMttast(hast))
          Transforms.insertFragment(editor, mttast.children)

          // Transforms.insertFragment(editor, mttast.children, {at: [0, 0]})

          return
        }

        var text = data.getData('text/plain')

        if (text) {
          var lines = text
            .split(/\r\n|\r|\n/)
            .filter((l) => l != '')
            .join('\n')

          var newData = new DataTransfer()
          newData.setData('text/plain', lines)
          insertData(newData)
          return
        }
        insertData(data)
      }

      return editor
    },
  }
}

function removeEmptyText(tree: any) {
  visit(tree, 'text', (node: any, index: any, parent: any) => {
    if (node.value === '') {
      parent.children.splice(index, 1, ...node.children)
    }
  })

  return tree
}
