import {createModel} from 'xstate/lib/model'

export const sidebarModel = createModel(
  {},
  {
    events: {
      SIDEBAR_OPEN: () => ({}),
      SIDEBAR_CLOSE: () => ({}),
      SIDEBAR_TOGGLE: () => ({}),
    },
  },
)

export const sidebarMachine = sidebarModel.createMachine({
  initial: 'opened',
  context: sidebarModel.initialContext,
  states: {
    opened: {
      on: {
        SIDEBAR_CLOSE: 'closed',
        SIDEBAR_TOGGLE: 'closed',
      },
    },
    closed: {
      on: {
        SIDEBAR_OPEN: 'opened',
        SIDEBAR_TOGGLE: 'opened',
      },
    },
  },
})
