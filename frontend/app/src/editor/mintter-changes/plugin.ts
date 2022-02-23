import { EditorPlugin } from '@app/editor/types'
import { FlowContent } from '@mintter/mttast'
import { Editor, NodeEntry, Operation } from 'slate'
import { interpret } from 'xstate'
import { createModel } from 'xstate/lib/model'

export function createMintterChangesPlugin(): EditorPlugin {
  return {
    name: 'mintter',
    configureEditor(editor) {
      const { apply } = editor

      editor.apply = mintterApply(editor, apply)

      return editor
    },
  }
}

export const ADD_BLOCK = 'ADD.BLOCK'
export const REMOVE_BLOCK = 'REMOVE.BLOCK'

const changesModel = createModel({
  upsertBlocks: {} as { [key: string]: Path | null },
  deleteBlocks: [] as Array<string>
}, {
  events: {
    [ADD_BLOCK]: (id: string, path: Path) => ({ id, path }),
    [REMOVE_BLOCK]: (id: string) => ({ id }),
    reset: () => ({})
  }
})

export const changesMachine = changesModel.createMachine({
  initial: 'ready',
  context: changesModel.initialContext,
  states: {
    ready: {
      on: {
        [ADD_BLOCK]: {
          actions: [changesModel.assign({
            upsertBlocks: (context, event) => ({
              ...context.upsertBlocks,
              [event.id]: event.path
            })
          })]
        },
        [REMOVE_BLOCK]: {
          actions: [changesModel.assign((context, event) => ({
            upsertBlocks: context.upsertBlocks[event.id] ? { ...context.upsertBlocks, [event.id]: null } : context.upsertBlocks,
            deleteBlocks: context.deleteBlocks.includes(event.id) ? context.deleteBlocks : [...context.deleteBlocks, event.id]
          }))]
        },
        reset: {
          actions: [changesModel.assign({
            upsertBlocks: {},
            deleteBlocks: []
          })]
        }
      }
    },
  }
})

export let changesService = interpret(changesMachine)


function mintterApply(editor: Editor, cb: (op: Operation) => void) {
  let service = changesService.start()
  return function apply(operation: Operation) {

    if (operation.type != 'set_selection') {
      let block = Editor.above(editor, {
        match: isFlowContent,
      })

      if (block) {
        let [node, path] = block

        if (operation.type == 'remove_node') {
          service.send(changesModel.events[REMOVE_BLOCK](node.id))
        } else {
          service.send(changesModel.events[ADD_BLOCK](node.id, path))
        }

      }
    }


    cb(operation)
  }
}

type ComparePathParams = {
  list: Array<NodeEntry<FlowContent>>
  currentEntry: NodeEntry<FlowContent>
  newEntry: NodeEntry<FlowContent>
}

export function checkBlockPath({ list, currentEntry, newEntry }: ComparePathParams): Array<NodeEntry<FlowContent>> {
  let newList: Array<NodeEntry<FlowContent>> = [...list]
  let elIndex = newList.indexOf(currentEntry)
  if (currentEntry[1] != newEntry[1]) {
    newList[elIndex] = newEntry
  } else {
    return list
  }

  return newList
}
