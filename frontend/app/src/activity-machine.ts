import {store} from '@app/client/store'
import {error} from '@app/utils/logger'
import {assign, createMachine} from 'xstate'

const ACTIVITY = 'Activity'

type ActivityEvent =
  | {
      type: 'VISIT.PUBLICATION'
      url: string
    }
  | {type: 'RESET'}

type ActivityContext = {
  visitList: Array<string>
}

export const activityMachine = createMachine(
  {
    id: 'activityMachine',
    tsTypes: {} as import('./activity-machine.typegen').Typegen0,
    schema: {
      context: {} as ActivityContext,
      events: {} as ActivityEvent,
    },
    context: {
      visitList: [],
    },
    invoke: {
      id: 'getActivityList',
      src: 'getActivityList',
      onDone: {
        actions: ['assignList'],
      },
      onError: {
        actions: (_, event) => {
          error('Activity Error: no list found', event.data)
        },
      },
    },
    initial: 'idle',
    states: {
      idle: {},
    },
    on: {
      'VISIT.PUBLICATION': [
        {
          cond: 'hasVisited',
        },
        {
          actions: ['updateList', 'persist'],
        },
      ],
      RESET: {
        actions: ['resetList'],
      },
    },
  },
  {
    guards: {
      hasVisited: (context, event) => {
        return context.visitList.includes(event.url)
      },
    },
    services: {
      getActivityList: () =>
        store.get<Array<string>>(ACTIVITY).then((res) => {
          if (!res) return []
          return res
        }),
    },
    actions: {
      assignList: assign({
        visitList: (_, event) => event.data as Array<string>,
      }),
      updateList: assign({
        visitList: (context, event) => {
          let newList = [...context.visitList, event.url]
          store.set(ACTIVITY, newList)
          return newList
        },
      }),
      resetList: assign({
        visitList: (c) => {
          store.set(ACTIVITY, [])
          return []
        },
      }),
    },
  },
)
