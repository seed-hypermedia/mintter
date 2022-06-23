import {DocumentChange} from '@app/client'
import {
  createDeleteChange,
  createMoveChange,
  createReplaceChange,
} from '@app/client/v2/change-creators'
import {EditorPlugin} from '@app/editor/types'
import {isFlowContent} from '@mintter/mttast'
import {Editor, Operation, Path} from 'slate'
import {info} from 'tauri-plugin-log-api'
import {getEditorBlock} from '../utils'

export function createMintterChangesPlugin(): EditorPlugin {
  return {
    name: 'mintter',
    configureEditor(editor) {
      editor = {...editor, ...MintterChangesEditor}

      const {apply} = editor
      editor.apply = (operation: Operation) => {
        apply(operation)

        info('== operation ==')
        info(JSON.stringify(operation))

        // switch (operation.type) {
        //   case 'insert_node':
        //     if (isFlowContent(operation.node)) {
        //       // TODO: wtf I wanted to do here?

        //       addOperation(editor!, 'moveBlock', operation.node)
        //       addOperation(editor!, 'replaceBlock', operation.node)
        //     } else {
        //       insertNode(editor!, operation.path)
        //     }
        //     break
        //   case 'insert_text':
        //   case 'set_node':
        //   case 'split_node':
        //   case 'remove_text':
        //     replaceText(editor!, operation.path)
        //     break
        //   case 'remove_node':
        //     if (isFlowContent(operation.node)) {
        //       addOperation(editor!, 'deleteBlock', operation.node)
        //     } else {
        //       replaceText(editor!, operation.path)
        //     }

        //     break
        //   default:
        //     break
        // }
      }

      return editor
    },
  }
}

type ChangeType = NonNullable<DocumentChange['op']>['$case'] | undefined

export type ChangeOperation = [ChangeType, string]

export interface MintterChangesEditor {
  __mintterChanges: Array<ChangeOperation>
  resetChanges(editor: Editor): void
  addChange(editor: Editor, entry: ChangeOperation): void
  getChanges(editor: Editor): Array<ChangeOperation>
  transformChanges(editor: Editor): Array<DocumentChange>
}

export const MintterChangesEditor: MintterChangesEditor = {
  __mintterChanges: [],
  resetChanges(editor: Editor & MintterChangesEditor) {
    editor.__mintterChanges = []
  },
  addChange(editor: Editor & MintterChangesEditor, entry: ChangeOperation) {
    let changes = editor.__mintterChanges

    if (shouldOverride(entry, changes[changes.length - 1])) {
      changes.pop()
    }

    changes.push(entry)
  },

  getChanges(editor: Editor & MintterChangesEditor): ChangeOperation[] {
    return editor.__mintterChanges
  },
  transformChanges(editor: Editor & MintterChangesEditor): DocumentChange[] {
    let result: Array<DocumentChange> = []
    editor.__mintterChanges.forEach((change) => {
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
}

function insertNode(editor: Editor, path: Path) {
  // TODO: Do I need this?
  // let entry = getEditorBlock(editor, {
  //   at: path,
  //   mode: 'lowest',
  // })
  // if (entry) {
  //   let [block] = entry
  //   addOperation(editor, 'moveBlock', block)
  //   addOperation(editor, 'replaceBlock', block)
  // }
}

function replaceText(editor: Editor & MintterChangesEditor, path: Path) {
  let entry = getEditorBlock(editor, {
    at: path,
  })

  if (entry) {
    let [block] = entry
    addOperation(editor, 'replaceBlock', block)
  }
}

function addOperation(
  editor: Editor & MintterChangesEditor,
  opType: ChangeType,
  node: Node,
) {
  if (isFlowContent(node)) {
    let newChange: ChangeOperation = [opType, node.id]
    if (
      !shouldOverride(
        newChange,
        editor.__mintterChanges[editor.__mintterChanges.length - 1],
      )
    ) {
      editor.__mintterChanges.push(newChange)
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
