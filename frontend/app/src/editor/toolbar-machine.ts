import {Selection} from 'slate'
import {createMachine, actions, assign, ExtractEvent} from 'xstate'

let {cancel, send} = actions

export const toolbarMachine = createMachine(
  {
    id: 'toolbar-machine',
    context: {
      selection: null,
      domRange: null,
    },
    states: {
      idle: {
        entry: ['clearSelection', 'assignDefaultSelection'],
        on: {
          'TOOLBAR.SELECT': {
            internal: true,
            actions: ['cancelSelection', 'commitSelection'],
          },
          'TOOLBAR.COMMIT.SELECTION': [
            {
              cond: 'isNotValid',
              actions: ['assignDefaultSelection'],
            },
            {
              actions: ['assignSelection'],
              target: 'active',
            },
          ],
        },
      },
      active: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              'TOOLBAR.DISMISS': {
                target: '#toolbar-machine.idle',
                actions: [
                  'removeSelectorMark',
                  'clearSelection',
                  'assignDefaultSelection',
                  'restoreDOMSelection',
                ],
              },
              'START.CONVERSATION': {
                actions: ['setSelectorMark', 'removeDOMSelection'],
                target: 'commenting',
              },
            },
          },
          commenting: {
            on: {
              'TOOLBAR.DISMISS': {
                actions: [
                  'removeSelectorMark',
                  'clearSelection',
                  'assignDefaultSelection',
                  'restoreDOMSelection',
                ],
                target: '#toolbar-machine.idle',
              },
            },
          },
        },
        on: {
          'TOOLBAR.SELECT': {
            internal: true,
            actions: ['assignSelection', 'cancelSelection', 'commitSelection'],
          },
        },
      },
    },

    initial: 'idle',
    tsTypes: {} as import('./toolbar-machine.typegen').Typegen0,
    schema: {
      events: {} as ToolbarMachineEvent,
      context: {} as ToolbarMachineContext,
    },
    predictableActionArguments: true,
  },
  {
    actions: {
      assignSelection: assign({
        selection: (_, e) => e.selection,
      }),
      cancelSelection: cancel('set-selection'),
      commitSelection: send(
        (_, e: ExtractEvent<ToolbarMachineEvent, 'TOOLBAR.SELECT'>) => ({
          type: 'TOOLBAR.COMMIT.SELECTION',
          selection: e.selection,
        }),
        {
          delay: 500,
          id: 'set-selection',
        },
      ),
      clearSelection: assign({
        selection: (_) => null,
      }),
    },
  },
)

export type ToolbarMachineEvent =
  | {
      type: 'TOOLBAR.SELECT'
      selection: Selection
    }
  | {
      type: 'TOOLBAR.COMMIT.SELECTION'
      selection: Selection
    }
  | {
      type: 'TOOLBAR.DISMISS'
    }
  | {
      type: 'START.CONVERSATION'
    }

export type ToolbarMachineContext = {
  selection: Selection
  domRange: Range | null
}
