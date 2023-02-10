import {Path} from 'slate'
import {assign, createMachine} from 'xstate'

type DragContext = {
  fromPath: Path | null
  toPath: Path | null
}

type DragEvent =
  | {type: 'DRAG.START'; fromPath: Path}
  | {type: 'DROPPED'}
  | {type: 'DRAG.OVER'; toPath: Path}

export var dragMachine = createMachine(
  {
    predictableActionArguments: true,
    context: {fromPath: null, toPath: null},
    schema: {context: {} as DragContext, events: {} as DragEvent},
    tsTypes: {} as import('./drag-machine.typegen').Typegen0,
    id: 'drag-machine',
    description: 'empty',
    initial: 'inactive',
    states: {
      inactive: {
        on: {
          'DRAG.START': {
            actions: ['setFromPath'],
            target: 'active',
          },
        },
        entry: ['resetPaths'],
      },
      active: {
        on: {
          DROPPED: {
            actions: ['performMove'],
            target: 'inactive',
          },
          'DRAG.OVER': {
            actions: ['setToPath'],
          },
        },
      },
    },
  },
  {
    actions: {
      setFromPath: assign({
        fromPath: (_, event) => {
          return event.fromPath
        },
      }),
      setToPath: assign({
        toPath: (_, event) => {
          return event.toPath
        },
      }),
      // @ts-ignore
      resetPaths: assign({
        fromPath: null,
        toPath: null,
      }),
    },
  },
)
