import {store} from '@app/client/store'
import {createMachine} from 'xstate'

export const LIBRARY = 'LIBRARY'

type LibraryEvent =
  | {type: 'LIBRARY.OPEN'}
  | {type: 'LIBRARY.CLOSE'}
  | {type: 'LIBRARY.TOGGLE'}

export var libraryMachine = createMachine(
  {
    id: 'library-machine',
    predictableActionArguments: true,
    tsTypes: {} as import('./library-machine.typegen').Typegen0,
    schema: {
      events: {} as LibraryEvent,
      services: {} as {
        getLibraryStore: {
          data: boolean | null
        }
      },
    },
    initial: 'readingStore',
    states: {
      readingStore: {
        invoke: {
          src: 'getLibraryStore',
          id: 'getLibraryStore',
          onDone: [
            {
              target: 'opened',
              cond: 'wasOpen',
            },
            {
              target: 'closed',
            },
          ],
          onError: {
            target: 'closed',
          },
        },
      },
      opened: {
        entry: ['persistOpen'],
        on: {
          'LIBRARY.CLOSE': 'closed',
          'LIBRARY.TOGGLE': 'closed',
        },
      },
      closed: {
        entry: ['persistClose'],
        on: {
          'LIBRARY.OPEN': 'opened',
          'LIBRARY.TOGGLE': 'opened',
        },
      },
    },
  },
  {
    guards: {
      wasOpen: (_, event) => {
        return event.data ?? false
      },
    },
    actions: {
      persistClose: () => {
        store.set(LIBRARY, false)
      },
      persistOpen: () => {
        store.set(LIBRARY, true)
      },
    },
    services: {
      getLibraryStore: () => store.get<boolean>(LIBRARY),
    },
  },
)
