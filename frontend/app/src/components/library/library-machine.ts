import {createMachine} from 'xstate'

type LibraryEvent =
  | {type: 'LIBRARY.OPEN'}
  | {type: 'LIBRARY.CLOSE'}
  | {type: 'LIBRARY.TOGGLE'}

export var libraryMachine = createMachine({
  id: 'library-machine',
  predictableActionArguments: true,
  tsTypes: {} as import('./library-machine.typegen').Typegen0,
  schema: {
    events: {} as LibraryEvent,
  },
  initial: 'opened',
  states: {
    opened: {
      on: {
        'LIBRARY.CLOSE': 'closed',
        'LIBRARY.TOGGLE': 'closed',
      },
    },
    closed: {
      on: {
        'LIBRARY.OPEN': 'opened',
        'LIBRARY.TOGGLE': 'opened',
      },
    },
  },
})
