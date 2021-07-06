import {useStoreEditorState} from '@udecode/slate-plugins'
import type {Path} from 'slate'
import {ReactEditor} from 'slate-react'
import type {EditorBlock} from './types'

export function useNodePath(editor: ReactEditor, node: EditorBlock): Path {
  return ReactEditor.findPath(editor, node)
}
