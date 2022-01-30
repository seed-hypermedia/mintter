import {createModel} from 'xstate/lib/model'

export const libraryModel = createModel(
  {},
  {
    events: {
      'LIBRARY.OPEN': () => ({}),
      'LIBRARY.CLOSE': () => ({}),
      'LIBRARY.TOGGLE': () => ({}),
    },
  },
)

export const libraryMachine = libraryModel.createMachine({
  initial: 'opened',
  context: libraryModel.initialContext,
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
