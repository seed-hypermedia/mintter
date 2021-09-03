import {createMachine, assign} from 'xstate'

export type HoverMachineEvent = {
  type: 'mouseenter' | 'mouseleave'
}
export const hoverMachine = createMachine<{element: HTMLLIElement | null}, HoverMachineEvent>(
  {
    id: 'hover-machine',
    context: {
      element: null,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          mouseenter: {
            target: 'idle',
            actions: ['setElementInContext'],
          },
          mouseleave: {
            target: 'idle',
            actions: ['clearElementInContext'],
          },
        },
      },
    },
  },
  {
    actions: {
      setElementInContext: assign({
        element: (_, event) => event.target,
      }),
      clearElementInContext: assign({
        element: null,
      }),
    },
  },
)
