import {createModel} from 'xstate/lib/model'

export const libraryModel = createModel(
  {},
  {
    events: {
      LIBRARY_OPEN: () => ({}),
      LIBRARY_CLOSE: () => ({}),
      LIBRARY_TOGGLE: () => ({}),
    },
  },
)

export const libraryMachine = libraryModel.createMachine({
  initial: 'opened',
  context: libraryModel.initialContext,
  states: {
    opened: {
      on: {
        LIBRARY_CLOSE: 'closed',
        LIBRARY_TOGGLE: 'closed',
      },
    },
    closed: {
      on: {
        LIBRARY_OPEN: 'opened',
        LIBRARY_TOGGLE: 'opened',
      },
    },
  },
})
