import {DocumentChange} from '@app/client'
import {
  createDeleteChange,
  createMoveChange,
  createReplaceChange,
} from '@app/client/v2/change-creators'
import {EditorPlugin} from '@app/editor/types'
import {getBlock} from '@app/editor/utils'
import {FlowContent, isFlowContent} from '@mintter/mttast'
import {Editor, Node, Operation, Path} from 'slate'

export function createMintterChangesPlugin(): EditorPlugin {
  return {
    name: 'mintter',
    configureEditor(editor) {
      const {apply} = editor
      editor.apply = mintterApply(editor, apply)

      return editor
    },
  }
}

export let changesService = changesServiceCreator()

function mintterApply(editor: Editor, cb: (op: Operation) => void) {
  return function apply(operation: Operation) {
    cb(operation)
    // we send the operation AFTER we apply it to the changes to get the new editor state. if we call it before, we will not get the current operation change in the editor value.

    changesService.send({operation, editor})
  }
}

type ChangeType = NonNullable<DocumentChange['op']>['$case'] | undefined

export type ChangeOperation = [ChangeType, string]

export type ChangesEvent = {editor?: Editor; operation: Operation}

type BlocksObject = {[key: string]: {node: FlowContent; path: Path}}

export function changesServiceCreator() {
  let changes: Array<ChangeOperation> = []

  return {
    getChanges,
    addChange,
    send,
    reset,
    transformChanges,
  }

  function reset() {
    console.log('RESET CHANGES PLIS')

    changes = []
  }

  function send({operation, editor}: ChangesEvent) {
    console.log('operation: ', operation)

    switch (operation.type) {
      case 'insert_node':
        if (isFlowContent(operation.node)) {
          let entry = getBlock(editor!, {
            at: operation.path,
          })
          console.log('insert_node entry: ', entry)

          addOperation(editor!, 'moveBlock', operation.node)
        } else {
          insertNode(editor!, operation.path)
        }
        break
      case 'insert_text':
      case 'set_node':
      case 'split_node':
      case 'remove_text':
        replaceText(editor!, operation.path)
        break
      case 'remove_node':
        addOperation(editor!, 'deleteBlock', operation.node)
        break
      default:
        break
    }
  }

  function addChange(entry: ChangeOperation) {
    if (shouldOverride(entry, changes[changes.length - 1])) {
      changes.pop()
    }
    changes.push(entry)
  }

  function insertNode(editor: Editor, path: Path) {
    let entry = getBlock(editor, {
      at: path,
      mode: 'lowest',
    })
    console.log(
      '🚀 ~ file: plugin.ts ~ line 99 ~ insertNode ~ entry',
      entry,
      editor,
    )
    // if (entry) {
    //   let [block] = entry
    //   addOperation(editor, 'moveBlock', block)
    //   addOperation(editor, 'replaceBlock', block)
    // }
  }

  function replaceText(editor: Editor, path: Path) {
    let entry = getBlock(editor, {
      at: path,
    })

    if (entry) {
      let [block] = entry
      addOperation(editor, 'replaceBlock', block)
    }
  }

  function getChanges(): Array<ChangeOperation> {
    return changes
  }

  function addOperation(editor: Editor, opType: ChangeType, node: Node) {
    if (isFlowContent(node)) {
      let newChange: ChangeOperation = [opType, node.id]
      if (!shouldOverride(newChange, changes[changes.length - 1])) {
        changes.push(newChange)
      }
    }
  }

  function transformChanges(editor: Editor): Array<DocumentChange> {
    let result: Array<DocumentChange> = []

    changes.forEach((change) => {
      let [type, value] = change
      if (type == 'deleteBlock') {
        result.push(createDeleteChange(value))
      }

      if (type == 'moveBlock') {
        result.push(createMoveChange(editor, value))
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
