import {DocumentChange} from '@app/client'
import {
  createDeleteChange,
  createMoveChange,
  createReplaceChange,
} from '@app/client/v2/change-creators'
import {isFlowContent} from '@mintter/mttast'
import {Editor, Path} from 'slate'
import {info} from 'tauri-plugin-log-api'
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
        info('== operation ==')
        info(JSON.stringify(op))

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
          default:
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
    editor.__mtt_changes.forEach((change) => {
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
