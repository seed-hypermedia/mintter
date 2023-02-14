import {Path} from 'slate'
import {assign, createMachine} from 'xstate'

type DragContext = {
  dragRef: HTMLElement | null
  fromPath: Path | null
  toPath: Path | null
}

type DragEvent =
  | {type: 'DRAG.START'; fromPath: Path; element: HTMLElement}
  | {type: 'DROPPED'}
  | {type: 'DRAG.OVER'; toPath: Path; element: HTMLElement}

export var dragMachine = createMachine(
  {
    predictableActionArguments: true,
    context: {dragRef: null, fromPath: null, toPath: null},
    schema: {context: {} as DragContext, events: {} as DragEvent},
    tsTypes: {} as import('./drag-machine.typegen').Typegen0,
    id: 'drag-machine',
    description: 'empty',
    initial: 'inactive',
    states: {
      inactive: {
        on: {
          'DRAG.START': {
            actions: ['setFromPath', 'setDragRef'],
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
            actions: ['setToPath', 'setDragRef'],
          },
        },
      },
    },
  },
  {
    actions: {
      setDragRef: assign({
        dragRef: (context, event) => {
          context.dragRef?.removeAttribute('data-action')
          const element = event.element
          element.setAttribute('data-action', 'dragged')
          return element
        },
      }),
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
        dragRef: null,
        fromPath: null,
        toPath: null,
      }),
    },
  },
)
