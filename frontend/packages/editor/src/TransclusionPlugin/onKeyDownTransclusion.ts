import {isSelectionInTransclusion} from '../MintterPlugin/isSelectionInBlockItem'
import {Editor} from 'slate'

export const onKeyDownTransclusion = options => (
  e: KeyboardEvent,
  editor: Editor,
) => {
  if (e.key === 'Enter') {
    console.log('enter clicked')
    let res = isSelectionInTransclusion(editor, options)
    console.log('keyDown transclusion', {res, selection: editor.selection})

    if (!res) return
  }
}
