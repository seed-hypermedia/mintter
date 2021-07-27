import {useMemo} from 'react'
import {createGroupPlugin} from './elements/group'
import {createParagraphPlugin} from './elements/paragraph'
import {createStatementPlugin} from './elements/statement'
import type {SlatePlugin} from './types'
import {buildEditor, MTTEditor} from './utils'

interface UseMintterEditorResult {
  editor: MTTEditor
}

const defaultPlugins: Array<SlatePlugin> = [createGroupPlugin(), createStatementPlugin(), createParagraphPlugin()]

export function useMintterEditor({plugins = defaultPlugins} = {}): UseMintterEditorResult {
  const editor = useMemo(() => buildEditor(plugins), [plugins])

  return {
    editor,
    plugins,
  }
}
