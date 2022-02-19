import {EditorPlugin} from '@app/editor/types'
import {isStatement, Statement} from '@mintter/mttast'
import {Editor, NodeEntry, Operation} from 'slate'
import {interpret} from 'xstate'
import {createModel} from 'xstate/lib/model'

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

export const ADD_BLOCK = 'ADD.BLOCK'

const changesModel = createModel(
  {
    blocks: [] as Array<NodeEntry<Statement>>,
  },
  {
    events: {
      [ADD_BLOCK]: (block: NodeEntry<Statement>) => ({block}),
    },
  },
)

export const changesMachine = changesModel.createMachine(
  {
    initial: 'ready',
    context: changesModel.initialContext,
    states: {
      ready: {
        on: {
          [ADD_BLOCK]: {
            actions: ['addBlockToList'],
          },
        },
      },
    },
  },
  {
    actions: {
      addBlockToList: changesModel.assign({
        blocks: (context, event) => {
          let isIncluded = context.blocks.filter(checkBlockId)

          if (isIncluded.length) {
            // check if path is the same, if not, change it
            return checkBlockPath({list: context.blocks, currentEntry: isIncluded[0], newEntry: event.block})
          } else {
            return [...context.blocks, event.block]
          }

          function checkBlockId(entry: NodeEntry<Statement>): boolean {
            if (typeof entry == 'undefined') return false
            const [entryNode] = entry
            const [eventNode] = event.block
            return entryNode.id == eventNode.id
          }
        },
      }),
    },
  },
)

export function createChangesService() {
  return interpret(changesMachine)
}

function mintterApply(editor: Editor, cb: (op: Operation) => void) {
  let service = createChangesService().start()
  //@ts-ignore
  window.service = service
  return function apply(operation: Operation) {
    let block = Editor.above(editor, {
      match: isStatement,
    })

    if (block) {
      service.send(changesModel.events[ADD_BLOCK](block))
    }

    cb(operation)
  }
}

type ComparePathParams = {
  list: Array<NodeEntry<Statement>>
  currentEntry: NodeEntry<Statement>
  newEntry: NodeEntry<Statement>
}

export function checkBlockPath({list, currentEntry, newEntry}: ComparePathParams): Array<NodeEntry<Statement>> {
  let newList: Array<NodeEntry<Statement>> = [...list]
  let elIndex = newList.indexOf(currentEntry)
  if (currentEntry[1] != newEntry[1]) {
    newList[elIndex] = newEntry
  } else {
    return list
  }

  return newList
}
