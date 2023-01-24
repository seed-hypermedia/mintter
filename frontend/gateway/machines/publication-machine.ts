import {assign, createMachine} from 'xstate'
import {Publication, blockNodeToSlate, GroupingContent} from '@mintter/shared'

export const publicationMachine = createMachine(
  {
    context: {
      errorMessage: '',
    },
    initial: 'idle',
    states: {
      idle: {
        always: 'fetching',
      },
      fetching: {
        on: {
          'PUBLICATION.FETCH.SUCCESS': {
            actions: ['setPublication'],
            target: 'transforming',
          },
        },
      },
      transforming: {
        invoke: {
          id: 'transformPublication',
          src: 'transformPublication',
        },
        on: {
          'PUBLICATION.TRANSFORM.SUCCESS': {
            actions: ['setEditorValue'],
            target: 'settled',
          },
        },
      },
      settled: {
        on: {
          'PUBLICATION.FETCH.SUCCESS': {
            actions: ['setPublication'],
            target: 'transforming',
          },
        },
      },
    },
    tsTypes: {} as import('./publication-machine.typegen').Typegen0,
    schema: {
      context: {} as PublicationMachineContext,
      events: {} as PublicationMachineEvent,
    },
    predictableActionArguments: true,
  },
  {
    actions: {
      setPublication: assign({
        publication: (c, event) => event.publication,
      }),
      setEditorValue: assign({
        editorValue: (c, event) => event.value,
      }),
    },
    services: {
      transformPublication: (context, event) => (sendBack) => {
        if (context.publication?.document.children) {
          let value = blockNodeToSlate(
            context.publication?.document.children,
            'group',
          )
          sendBack({type: 'PUBLICATION.TRANSFORM.SUCCESS', value})
        }
      },
    },
  },
)

type PublicationMachineContext = {
  publication?: Publication
  editorValue?: GroupingContent
  errorMessage: string
}
type PublicationMachineEvent =
  | {type: 'PUBLICATION.FETCH.SUCCESS'; publication: Publication}
  | {type: 'PUBLICATION.FETCH.ERROR'; errorMessage: any}
  | {
      type: 'PUBLICATION.TRANSFORM.SUCCESS'
      value: any
    }
