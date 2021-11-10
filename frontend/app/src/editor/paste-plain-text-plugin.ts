import {EditorPlugin} from './types'

export function createPlainTextPastePlugin(): EditorPlugin {
  return {
    name: 'PastePlainTextPlugin',
    configureEditor(editor) {
      if (editor.readOnly) return
      const {insertData} = editor

      editor.insertData = customInsertData

      function customInsertData(data: DataTransfer): void {
        // const html = data.getData('text/html')

        // if (html) {
        //   console.log('html parsed!', html)
        //   return
        // }

        const text = data.getData('text/plain')
        if (text) {
          const lines = text
            .split(/\r\n|\r|\n/)
            .filter((l) => l != '')
            .join('\n')

          const newData = new DataTransfer()
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
