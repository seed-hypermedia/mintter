import {DocumentChange} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {getEditorBlock} from '@app/editor/utils'
import {FlowContent} from '@mintter/mttast'
import {Editor, Node, Path} from 'slate'

export function createMoveChange(
  editor: Editor,
  blockId: string,
): DocumentChange | undefined {
  let blockEntry = getEditorBlock(editor, {id: blockId})

  if (blockEntry) {
    let [, path] = blockEntry
    let parent =
      path.length == 2
        ? ''
        : (Node.parent(editor, Path.parent(path)) as FlowContent).id
    let leftSibling =
      path[path.length - 1] == 0
        ? ''
        : (Node.get(editor, Path.previous(path)) as FlowContent).id

    return {
      op: {
        $case: 'moveBlock',
        moveBlock: {
          parent,
          leftSibling,
          blockId,
        },
      },
    }
  } else {
    return
  }
}

export function createReplaceChange(
  editor: Editor,
  blockId: string,
): DocumentChange {
  let blockEntry = getEditorBlock(editor, {id: blockId})

  if (blockEntry) {
    return {
      op: {
        $case: 'replaceBlock',
        replaceBlock: blockToApi(blockEntry[0]),
      },
    }
  } else {
    // the block is removed since we take the editor as truth, so if there's no block in the editor, we should delete it
    return {
      op: {
        $case: 'deleteBlock',
        deleteBlock: blockId,
      },
    }
  }
}

export function createDeleteChange(blockId: string): DocumentChange {
  return {
    op: {
      $case: 'deleteBlock',
      deleteBlock: blockId,
    },
  }
}
