import {createModel} from 'xstate/lib/model'

const hoverModel = createModel(
  {
    blockId: null as string | null,
  },
  {
    events: {
      MOUSE_ENTER: (blockId: string) => ({blockId}),
      MOUSE_LEAVE: () => ({}),
    },
  },
)

export const hoverMachine = hoverModel.createMachine(
  {
    id: 'hover-machine',
    initial: 'ready',
    context: hoverModel.initialContext,
    states: {
      ready: {
        on: {
          MOUSE_ENTER: {
            actions: hoverModel.assign({
              blockId: (_, ev) => ev.blockId,
            }),
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
      clearData: hoverModel.assign(hoverModel.initialContext),
    },
  },
)
