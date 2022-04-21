import {assign, createMachine} from 'xstate'

type HoverContext = {
  blockId: string | null
}

type HoverEvent =
  | {
      type: 'MOUSE_ENTER'
      blockId: string
    }
  | {
      type: 'MOUSE_LEAVE'
    }

export const hoverMachine = createMachine(
  {
    id: 'hover-machine',
    tsTypes: {} as import('./hover-machine.typegen').Typegen0,
    schema: {
      context: {} as HoverContext,
      events: {} as HoverEvent,
    },
    initial: 'ready',
    context: {
      blockId: null,
    },
    states: {
      ready: {
        on: {
          MOUSE_ENTER: {
            actions: ['assignBlockId'],
          },
          MOUSE_LEAVE: {
            actions: ['clearData'],
          },
        },
      },
    },
  },
  {
    actions: {
      clearData: assign({
        blockId: (c) => null,
      }),
      assignBlockId: assign({
        blockId: (_, event) => event.blockId,
      }),
    },
  },
)
