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
    predictableActionArguments: true,
    tsTypes: {} as import('./activity-machine.typegen').Typegen0,
    schema: {
      context: {} as ActivityContext,
      events: {} as ActivityEvent,
    },
    context: {
      visitList: [],
    },
    initial: 'idle',
    states: {
      idle: {
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
      },
      ready: {},
    },
    on: {
      'VISIT.PUBLICATION': {
        actions: ['updateList', 'persist'],
      },

      RESET: {
        actions: ['resetList', 'persist'],
      },
    },
  },
  {
    guards: {
      // hasVisited: (context, event) => {
      //   console.log('hasVisited', context, event)
      //   return context.visitList.includes(event.url)
      // },
    },
    services: {
      getActivityList: () => {
        return store.get<Array<string>>(ACTIVITY).then((res) => {
          console.log('getActivityList', res)
          if (!res) return []
          return res
        })
      },
    },
    actions: {
      assignList: assign({
        visitList: (_, event) => {
          console.log('assignList', event)
          return event.data as Array<string>
        },
      }),
      updateList: assign({
        visitList: (context, event) => {
          console.log('visitList', context.visitList)
          let newList = [...context.visitList, event.url]
          return newList
        },
      }),
      resetList: assign({
        /*eslint-disable */
        visitList: function (): Array<string> {
          return []
        },
      }),
      persist: (context) => {
        store.set(ACTIVITY, context.visitList)
      },
    },
  },
)
