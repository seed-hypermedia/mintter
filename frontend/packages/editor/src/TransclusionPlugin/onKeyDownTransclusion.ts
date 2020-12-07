import {isSelectionInTransclusion} from '../MintterPlugin/isSelectionInBlockItem'
import {Editor, Path, Transforms} from 'slate'
import {getBlockAbove, getNextSiblingNodes} from '@udecode/slate-plugins'
import {v4 as uuid} from 'uuid'

export const onKeyDownTransclusion = options => (
  e: KeyboardEvent,
  editor: Editor,
) => {
  if (e.key === 'Enter') {
    let res = isSelectionInTransclusion(editor, options)
    if (!res) return
    createEmptyBlock(editor, options, res.blockPath)
    return
  }

  if (e.key === 'ArrowDown') {
    let res = isSelectionInTransclusion(editor, options)
    if (!res) return
    const blockAbove = getBlockAbove(editor, {at: res.blockPath})
    const [nextBlock] = getNextSiblingNodes(blockAbove, res.blockPath)

    if (!nextBlock) {
      createEmptyBlock(editor, options, res.blockPath)
    }
  }
}

function createEmptyBlock(editor: Editor, options, after) {
  const nextPath = Path.next(after)
  Editor.withoutNormalizing(editor, () => {
    Transforms.insertNodes(
      editor,
      {
        type: options.block.type,
        id: uuid(),
        children: [{type: options.p.type, children: [{text: ''}]}],
      },
      {
        at: nextPath,
      },
    )
    Transforms.select(editor, Editor.start(editor, nextPath))
  })
}
