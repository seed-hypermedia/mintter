import {assign, createMachine} from 'xstate'

export type HoverContext = {
  blockId: string | null
}

type HoverEvent = {type: 'MOUSE_ENTER'; blockId: string} | {type: 'MOUSE_LEAVE'}

export const hoverMachine = createMachine(
  {
    tsTypes: {} as import('./hover-machine.typegen').Typegen0,
    schema: {
      context: {} as HoverContext,
      events: {} as HoverEvent,
    },
    id: 'hover-machine',
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
      clearData: assign((context) => ({blockId: null})),
      assignBlockId: assign({
        blockId: (_, event) => event.blockId,
      }),
    },
  },
)
