import {Publication} from '@app/client'
import {FlowContent} from '@mintter/mttast'
import {createMachine} from 'xstate'

export type EmbedMachineContext = {
  publication: Publication | null
  block: FlowContent | null
  errorMessage: string
}

export type EmbedMachineEvent =
  | {
      type: 'REPORT.PUBLICATION.SUCCESS'
      publication: Publication
    }
  | {
      type: 'REPORT.PUBLICATION.ERROR'
      errorMessage: string
    }
  | {type: 'RETRY'}
  | {
      type: 'REPORT.BLOCK.SUCCESS'
      block: FlowContent
    }
  | {
      type: 'REPORT.BLOCK.ERROR'
      errorMessage: string
    }

export let embedMachine = createMachine({
  context: {
    errorMessage: '',
    publication: null,
    block: null,
  },
  tsTypes: {} as import('./embed-machine.typegen').Typegen0,
  schema: {context: {} as EmbedMachineContext, events: {} as any},
  id: 'embedMachine',
  initial: 'loading',
  states: {
    loading: {
      initial: 'publication',
      states: {
        publication: {
          invoke: {
            src: 'fetchPublication',
            id: 'fetchPublication',
          },
          on: {
            'REPORT.PUBLICATION.SUCCESS': {
              actions: 'assignPublication',
              target: 'block',
            },
            'REPORT.PUBLICATION.ERROR': {
              actions: 'assignError',
              target: '#embedMachine.error',
            },
          },
        },
        block: {
          invoke: {
            src: 'filterBlock',
            id: 'filderBlock',
          },
          on: {
            'REPORT.BLOCK.SUCCESS': {
              actions: 'assignBlock',
              target: '#embedMachine.ready',
            },
            'REPORT.BLOCK.ERROR': {
              actions: 'assignError',
              target: '#embedMachine.error',
            },
          },
        },
      },
    },
    ready: {
      always: [],
    },
    error: {
      on: {
        RETRY: {
          target: 'loading',
        },
      },
    },
  },
})
