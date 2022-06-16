import { info } from '@app/utils/logger'
import { createMachine } from 'xstate'

type LibraryEvent =
  | { type: 'LIBRARY.OPEN' }
  | { type: 'LIBRARY.CLOSE' }
  | { type: 'LIBRARY.TOGGLE' }

export var libraryMachine = createMachine(
  {
    initial: 'opened',
    tsTypes: {} as import('./library-machine.typegen').Typegen0,
    schema: {
      events: {} as LibraryEvent,
    },
    states: {
      opened: {
        on: {
          'LIBRARY.CLOSE': {
            target: 'closed',
            actions: 'closing',
          },
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
  },
  {
    actions: {
      closing: (context, event) => {
        info(`CLOSING LIBRARY! - ${JSON.stringify({ context, event })}`)
      },
    },
  },
)
