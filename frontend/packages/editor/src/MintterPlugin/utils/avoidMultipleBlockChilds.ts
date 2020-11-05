import {Path, Transforms} from 'slate'
import {ELEMENT_PARAGRAPH} from '../../elements/defaults'
import {ELEMENT_BLOCK} from '../../BlockPlugin/defaults'
import {ELEMENT_BLOCK_LIST} from '../../HierarchyPlugin/defaults'
import {v4 as uuid} from 'uuid'

export function avoidMultipleBlockChilds(editor, entry): boolean {
  console.log('avoidMultipleBlockChilds -> editor, entry', {editor, entry})
  const [node, path] = entry

  if (path.length === 3) {
    if (path[path.length - 1] === 0) {
      // this should be a paragraph or something else
      // should not be a block_list
      if (node.type !== ELEMENT_PARAGRAPH) {
        console.log('⚠️ not a valid type as first child', node, path)
      }
    } else if (path[path.length - 1] === 1) {
      // this should be a block_list not anything else
      console.log('second child, should be a blockList', node, path)
      if (node.type !== ELEMENT_BLOCK_LIST) {
        moveToNextBlock(editor, path)
      }
    } else {
      // this should not be here, wrap and move outside
      console.log('⚠️ invalid child!!', node, path)

      let blockPath = Path.parent(path)
      let nextBlockPath = Path.next(blockPath)

      Transforms.moveNodes(editor, {
        at: path,
        to: nextBlockPath,
      })
      Transforms.wrapNodes(
        editor,
        {
          type: ELEMENT_BLOCK,
          id: uuid(),
          children: [],
        },
        {
          at: nextBlockPath,
        },
      )
    }
    return true
  }

  return false
}

function moveToNextBlock(editor, path) {
  let blockPath = Path.parent(path)
  let nextBlockPath = Path.next(blockPath)

  console.log('MOVE TO NEXT BLOCK!')
  Transforms.wrapNodes(
    editor,
    {
      type: ELEMENT_BLOCK,
      id: uuid(),
      children: [],
    },
    {
      at: path,
    },
  )

  Transforms.moveNodes(editor, {
    at: path,
    to: nextBlockPath,
  })
}
