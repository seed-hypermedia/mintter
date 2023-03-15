import {
  DocumentChange,
  createDeleteChange,
  createMoveChange,
  createReplaceChange,
  FlowContent,
  GroupingContent,
  isContent,
  isFlowContent,
  isGroupContent,
  isPhrasingContent,
  isStaticContent,
  isStaticPhrasingContent,
} from '@mintter/shared'
import {error} from '@app/utils/logger'
import {Editor, MoveNodeOperation, Node, Path} from 'slate'
import {EditorPlugin} from '../types'
import {getEditorBlock} from '../utils'

type ChangeType = NonNullable<DocumentChange['op']>['case'] | undefined
export type ChangeOperation = [ChangeType, string] | ['setRoot', string]

export function createMintterChangesPlugin(): EditorPlugin {
  return {
    name: 'mintter_changes',
    configureEditor(editor) {
      editor.__mtt_changes = []

      const {apply} = editor

      editor.apply = (op) => {
        // console.log('== operation ==')
        // console.log(JSON.stringify(op))

        switch (op.type) {
          case 'insert_node':
            if (isFlowContent(op.node)) {
              addOperation(editor, 'moveBlock', op.node)
              addOperation(editor, 'replaceBlock', op.node)
            } else {
              /**
               * TODO:
               * this code above breaks the editor because it does not find the node at the correct path
               * when indenting (tab)
               */
              // const [node] =
              //   Editor.above(editor, {at: op.path, match: isFlowContent}) || []
              // if (node) {
              //   addOperation(editor, 'replaceBlock', node)
              // }
            }
            break
          case 'set_node':
          case 'merge_node': {
            let node = Node.get(editor, op.path)

            if (!isFlowContent(node)) {
              const [_node] =
                Editor.above(editor, {
                  // at or above the current node
                  at: op.path,
                  match: isFlowContent,
                }) || []
              if (_node) {
                node = _node
              } else {
                addOperation(editor, 'setRoot', node)
              }
            }

            if (node) {
              addOperation(editor, 'replaceBlock', node)
            }
            break
          }
          case 'insert_text':
          case 'split_node':
          case 'remove_text':
            replaceText(editor, op.path)
            break
          case 'remove_node':
            if (isGroupContent(op.node)) {
              /**
               * Sometimes when we remove the whole list, we are removing blocks without even consider them. this iterates over the children (and the nested children of the groupContent)
               */
              addRemoveBlockOperation(editor, op.node)
            }
            if (isFlowContent(op.node)) {
              addOperation(editor, 'deleteBlock', op.node)
            } else {
              /**
               * we get into here if we are removing a node that is phrasing content
               */
              replaceText(editor, op.path)
            }
            break
          case 'move_node':
            moveNode(editor, op)
            break
          case 'set_selection':
            // there is no equivalent change to this operation so we ignore it
            break
          default:
            error('Unhandled operation', op)
            break
        }

        apply(op)
      }

      return editor
    },
  }
}

export interface MintterEditor {
  __mtt_changes: ChangeOperation[]
  resetChanges(editor: Editor): void
  addChange(editor: Editor, entry: ChangeOperation): void
  transformChanges(editor: Editor): Array<DocumentChange>
}

export const MintterEditor: MintterEditor = {
  __mtt_changes: [],
  transformChanges: function (editor: Editor): DocumentChange[] {
    const result: Array<DocumentChange> = []
    let orderedChanges = orderChanges(editor)

    orderedChanges.forEach((change) => {
      let [type, value] = change
      if (type == 'deleteBlock') {
        result.push(createDeleteChange(value))
      }

      if (type == 'moveBlock') {
        let change = createMoveChange(editor, value)
        if (change) result.push(change)
      }

      if (type == 'replaceBlock') {
        result.push(createReplaceChange(editor, value))
      }

      if (type == 'setTitle') {
        result.push(
          new DocumentChange({
            op: {
              case: 'setTitle',
              value,
            },
          }),
        )
      }

      if (type == 'setSubtitle') {
        result.push(
          new DocumentChange({
            op: {
              case: 'setSubtitle',
              value,
            },
          }),
        )
      }
    })

    return result
  },
  resetChanges: function (editor: Editor) {
    editor.__mtt_changes = []
  },
  addChange: function (editor: Editor, entry: ChangeOperation): void {
    if (
      shouldOverride(
        entry,
        editor.__mtt_changes[editor.__mtt_changes.length - 1],
      )
    ) {
      editor.__mtt_changes.pop()
    }
    editor.__mtt_changes.push(entry)
  },
}

function replaceText(editor: Editor, path: Path) {
  let entry = getEditorBlock(editor, {
    at: path,
  })

  if (entry) {
    let [block] = entry
    addOperation(editor, 'replaceBlock', block)
  }
}

function addOperation(
  editor: Editor,
  opType: ChangeType | 'setRoot',
  node: Node,
) {
  if (opType == 'setRoot') {
    editor.__mtt_changes.push(['setRoot', node.type])
  }
  if (isFlowContent(node)) {
    let newChange: ChangeOperation = [opType, node.id]
    if (
      !shouldOverride(
        newChange,
        editor.__mtt_changes[editor.__mtt_changes.length - 1],
      )
    ) {
      editor.__mtt_changes.push(newChange)
    }
  }
}

function shouldOverride(
  current: ChangeOperation,
  lastChange: ChangeOperation | undefined,
): boolean {
  if (lastChange) {
    let [op, blockId] = lastChange
    if (current[0] == op) {
      if (op == 'setTitle' || op == 'setSubtitle' || current[1] == blockId) {
        return true
      }
    }
  }

  return false
}

function moveNode(editor: Editor, operation: MoveNodeOperation) {
  let node = Node.get(editor, operation.path)

  if (isGroupContent(node)) {
    // TODO: iterate over the children and create operations for each
    ;(node as GroupingContent).children.forEach((block: FlowContent) => {
      addOperation(editor, 'moveBlock', block)
      addOperation(editor, 'replaceBlock', block)
    })
  } else if (isContent(node) || isStaticContent(node)) {
    let parent = Node.parent(editor, operation.path)
    addOperation(editor, 'moveBlock', parent)
    addOperation(editor, 'replaceBlock', parent)
  } else if (isPhrasingContent(node) || isStaticPhrasingContent(node)) {
    let [block] =
      Editor.above<FlowContent>(editor, {
        at: operation.path,
        match: isFlowContent,
      }) || []
    if (block) {
      addOperation(editor, 'moveBlock', block)
      addOperation(editor, 'replaceBlock', block)
    } else {
      error(
        'moveNode: getting the above block should always work',
        operation,
        node,
      )
    }
  } else if (isFlowContent(node)) {
    addOperation(editor, 'moveBlock', node)
    addOperation(editor, 'replaceBlock', node)
  } else {
    error('moveNode: We should not end up here', operation, node)
  }
}

function orderChanges(editor: Editor) {
  let newList: Array<ChangeOperation> = []
  let changes = editor.__mtt_changes
  for (const [node] of Node.elements(editor)) {
    if (isFlowContent(node)) {
      let filteredChanges = changes.filter(([, blockId]) => blockId == node.id)
      if (filteredChanges.length) {
        newList.push(...filteredChanges)
      } else {
        // debug(`orderChanges: no changes for id: ${node.id}`)
      }
    }
  }

  let pushItems = changes.filter(([type]) => type == 'deleteBlock')
  newList.push(...pushItems)
  return newList
}

function addRemoveBlockOperation(editor: Editor, node: GroupingContent) {
  node.children.forEach((block: FlowContent) => {
    addOperation(editor, 'deleteBlock', block)
    if (isGroupContent(block.children[1])) {
      addRemoveBlockOperation(editor, block.children[1])
    }
  })
}
