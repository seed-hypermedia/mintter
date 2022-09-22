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
  on: {
    '*': {
      actions: (c, e) => {
        console.log('TOGGLE', c, e)
      },
    },
  },
  states: {
    opened: {
      on: {
        'LIBRARY.CLOSE': {
          target: 'closed',
        },
        'LIBRARY.TOGGLE': {
          actions: (c, e) => {
            console.log('TOGGLE', c, e)
          },
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
          actions: (c, e) => {
            console.log('TOGGLE', c, e)
          },
          target: 'opened',
        },
      },
    },
  },
})
