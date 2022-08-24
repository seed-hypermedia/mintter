import {createMachine} from 'xstate'

type LibraryEvent =
  | {type: 'LIBRARY.OPEN'}
  | {type: 'LIBRARY.CLOSE'}
  | {type: 'LIBRARY.TOGGLE'}

export var libraryMachine = createMachine({
  predictableActionArguments: true,
  tsTypes: {} as import('./library-machine.typegen').Typegen0,
  schema: {
    events: {} as LibraryEvent,
  },
  initial: 'opened',
  states: {
    opened: {
      on: {
        'LIBRARY.CLOSE': {
          target: 'closed',
        },
        'LIBRARY.TOGGLE': {
          target: 'closed',
        },
      },
    },
    closed: {
      on: {
        'LIBRARY.OPEN': {
          target: 'opened',
        },
        'LIBRARY.TOGGLE': {
          target: 'opened',
        },
      },
    },
  },
})
