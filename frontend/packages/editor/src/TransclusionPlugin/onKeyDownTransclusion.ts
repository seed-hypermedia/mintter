import {isSelectionInTransclusion} from '../MintterPlugin/isSelectionInBlockItem'
import {Editor} from 'slate'
import {getBlockAbove, getNextSiblingNodes} from '@udecode/slate-plugins'

export const onKeyDownTransclusion = options => (
  e: KeyboardEvent,
  editor: Editor,
) => {
  if (e.key === 'Enter') {
    let res = isSelectionInTransclusion(editor, options)
    if (!res) return
    console.log('Enter in Transclusion', {res, selection: editor.selection})
  }

  if (e.key === 'ArrowDown') {
    let res = isSelectionInTransclusion(editor, options)
    if (!res) return

    console.log('ArrowDown in Transclusion', {res, selection: editor.selection})
    const blockAbove = getBlockAbove(editor, {at: res.blockPath})
    const [nextBlock] = getNextSiblingNodes(blockAbove, res.blockPath)

    if (!nextBlock) {
      console.log('create a new block')
    }
  }
}
