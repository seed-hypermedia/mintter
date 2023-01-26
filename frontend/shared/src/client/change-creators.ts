import {DocumentChange} from './.generated/documents/v1alpha/documents_pb'
import {blockToApi} from './block-to-api'
import {
  FlowContent,
  GroupingContent,
  isFlowContent,
  isOrderedList,
} from '../mttast'
import {Editor, Node, NodeEntry, Path} from 'slate'

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

    new DocumentChange({
      op: {
        case: 'moveBlock',
        value: {
          parent,
          leftSibling,
          blockId,
        },
      },
    })
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
    let [block] = blockEntry
    var childrenType
    var start
    if (block.children.length > 1) {
      let groupChild = block.children[1] as GroupingContent
      childrenType = groupChild.type
      if (isOrderedList(groupChild)) {
        start = groupChild.start
      }
    }
    return new DocumentChange({
      op: {
        case: 'replaceBlock',
        //TODO: fix parent types
        value: blockToApi(blockEntry[0], childrenType, start),
      },
    })
  } else {
    // the block is removed since we take the editor as truth, so if there's no block in the editor, we should delete it
    return new DocumentChange({
      op: {
        case: 'deleteBlock',
        value: blockId,
      },
    })
  }
}

export function createDeleteChange(blockId: string): DocumentChange {
  return new DocumentChange({
    op: {
      case: 'deleteBlock',
      value: blockId,
    },
  })
}

// TODO: this function and types below is copied from utils.ts inside the app. need to define where this function should live.
type GetBlockOptions = Omit<
  Parameters<typeof Editor.nodes>[1] & {
    id?: string
  },
  'match'
>

export function getEditorBlock(
  editor: Editor,
  options: GetBlockOptions,
): NodeEntry<FlowContent> | undefined {
  let [match] = Editor.nodes<FlowContent>(editor, {
    ...options,
    reverse: true,
    mode: 'lowest',
    match: (n) => matcher(n, options.id),
    at: options.at ?? [],
  })

  return match

  function matcher(n: Node, id?: FlowContent['id']): boolean {
    if (id) {
      return isFlowContent(n) && n.id == id
    } else {
      return isFlowContent(n)
    }
  }
}
