import {Editor} from 'slate'
import {unwrapNodesByType} from '@udecode/slate-plugins'

export const unwrapBlockList = (editor: Editor, options?: any) => {
  const {block, block_list} = options

  unwrapNodesByType(editor, block.type)
  unwrapNodesByType(editor, block_list.type, {split: true})
}
