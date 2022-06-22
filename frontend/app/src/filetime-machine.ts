import {assign, createMachine} from 'xstate'
type FileTimeEvent = {
  type: 'CLICK'
}

export type FileTimeContext = {
  type: 'draft' | 'pub'
  current?: Date
  createTime?: Date
  updateTime?: Date
  publishTime?: Date
  showLabel: boolean
}

export const fileTimeMachine = createMachine(
  {
    initial: 'showCreateTime',
    tsTypes: {} as import('./filetime-machine.typegen').Typegen0,
    schema: {
      context: {} as FileTimeContext,
      events: {} as FileTimeEvent,
    },
    states: {
      showCreateTime: {
        entry: ['assignCreateTimeToCurrent', 'showLabel'],
        after: {
          1000: {
            actions: ['hideLabel'],
          },
        },
        on: {
          CLICK: 'showUpdateTime',
        },
      },
      showUpdateTime: {
        entry: ['assignUpdateTimeToCurrent', 'showLabel'],
        after: {
          1000: {
            actions: ['hideLabel'],
          },
        },
        on: {
          CLICK: [
            {
              cond: 'isDraft',
              target: 'showCreateTime',
            },
            {
              target: 'showPublishTime',
            },
          ],
        },
      },
      showPublishTime: {
        entry: ['assignPublishTimeToCurrent', 'showLabel'],
        after: {
          1000: {
            actions: ['hideLabel'],
          },
        },
        on: {
          CLICK: 'showCreateTime',
        },
      },
    },
  },
  {
    guards: {
      isDraft: (context) => context.type == 'draft',
    },
    actions: {
      assignCreateTimeToCurrent: assign({
        current: (context) => context.createTime,
      }),
      assignUpdateTimeToCurrent: assign({
        current: (context) => context.updateTime,
      }),
      assignPublishTimeToCurrent: assign({
        current: (context) => context.publishTime,
      }),
      hideLabel: assign({
        showLabel: (context) => false,
      }),
      showLabel: assign({
        showLabel: (context) => true,
      }),
    },
  },
)
