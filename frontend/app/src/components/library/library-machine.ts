import { createMachine } from "xstate"

type LibraryEvent =
  | { type: 'LIBRARY.OPEN' }
  | { type: 'LIBRARY.CLOSE' }
  | { type: 'LIBRARY.TOGGLE' }

export const libraryMachine = createMachine({
  initial: 'opened',
  tsTypes: {} as import("./library-machine.typegen").Typegen0,
  schema: {
    events: {} as LibraryEvent
  },
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
