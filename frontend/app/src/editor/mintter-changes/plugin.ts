import {DocumentChange} from '@app/client'
import {
  createDeleteChange,
  createMoveChange,
  createReplaceChange,
} from '@app/client/v2/change-creators'
import {error} from '@app/utils/logger'
import {
  FlowContent,
  GroupingContent,
  isContent,
  isFlowContent,
  isGroupContent,
  isPhrasingContent,
  isStaticContent,
  isStaticPhrasingContent,
} from '@mintter/mttast'
import {Editor, MoveNodeOperation, Node, Path} from 'slate'
import {EditorPlugin} from '../types'
import {getEditorBlock} from '../utils'

type ChangeType = NonNullable<DocumentChange['op']>['$case'] | undefined

export type ChangeOperation = [ChangeType, string]

export function createMintterChangesPlugin(): EditorPlugin {
  return {
    name: 'mintter_changes',
    configureEditor(editor) {
      editor.__mtt_changes = []

      const {apply} = editor

      editor.apply = (op) => {
        console.log('== operation ==')
        console.log(JSON.stringify(op))

        switch (op.type) {
          case 'insert_node':
            if (isFlowContent(op.node)) {
              // TODO: wtf I wanted to do here?

              addOperation(editor, 'moveBlock', op.node)
              addOperation(editor, 'replaceBlock', op.node)
            } else {
              // throw new Error('todo')
              // insertNode(editor, operation.path)
            }
            break
          case 'insert_text':
          case 'set_node':
          case 'split_node':
          case 'remove_text':
            replaceText(editor, op.path)
            break
          case 'remove_node':
            if (isFlowContent(op.node)) {
              addOperation(editor, 'deleteBlock', op.node)
            } else {
              replaceText(editor, op.path)
            }
            break
          case 'move_node':
            moveNode(editor, op)
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
        result.push({
          op: {
            $case: type,
            setTitle: value,
          },
        })
      }

      if (type == 'setSubtitle') {
        result.push({
          op: {
            $case: 'setSubtitle',
            setSubtitle: value,
          },
        })
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

function addOperation(editor: Editor, opType: ChangeType, node: Node) {
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
    let [block, blockPath] =
      Editor.above<FlowContent>(editor, {
        at: operation.path,
        match: isFlowContent,
      }) || []
    if (block && blockPath) {
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
      let filteredChanges = changes.filter(
        ([op, blockId]) => blockId == node.id,
      )
      console.log({filteredChanges})

      newList.push(...filteredChanges)
    }
  }

  console.log({newList})

  return newList
}
