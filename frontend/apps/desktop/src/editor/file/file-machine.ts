import {assign, createMachine} from 'xstate'

type FileContext = {
  errorMessage: string
  captionVisibility: boolean
}

type FileEvent =
  | {type: 'FILE.REPLACE'}
  | {type: 'FILE.SUBMIT'; value: string}
  | {type: 'FILE.CANCEL'}
  | {type: 'REPORT.FILE.VALID'}
  | {type: 'REPORT.FILE.INVALID'}
  | {type: 'CAPTION.UPDATE'; value: string}

type FileServices = {
  validateUrlService: {
    data: string | undefined
  }
}

export const fileMachine = createMachine(
  {
    id: 'file-machine',
    predictableActionArguments: true,
    tsTypes: {} as import('./file-machine.typegen').Typegen0,
    schema: {
      context: {} as FileContext,
      events: {} as FileEvent,
      services: {} as FileServices,
    },
    description:
      'Context: caption, fileURL (the file imput should be uncontrolled)',
    context: {
      errorMessage: '',
      captionVisibility: false,
    },
    initial: 'checking',
    states: {
      checking: {
        always: [
          {
            cond: 'hasFileUrl',
            target: 'file',
          },
          {
            target: 'edit.new',
          },
        ],
      },
      file: {
        entry: ['assignCaptionVisibility'],
        on: {
          'FILE.REPLACE': {
            target: 'edit.update',
          },
          'CAPTION.UPDATE': {
            actions: ['updateCaption'],
          },
        },
      },
      edit: {
        initial: 'new',
        states: {
          new: {},
          update: {
            on: {
              'FILE.CANCEL': {
                target: '#file-machine.file',
              },
            },
          },
        },
        on: {
          'FILE.SUBMIT': {
            target: 'file',
            actions: ['assignValidUrl', 'enableCaption'],
          },
        },
      },
      // submitting: {
      //   entry: ['clearError'],
      //   invoke: {
      //     src: 'validateUrlService',
      //     id: 'validateUrlService',
      //     onDone: {
      //       target: 'image',
      //       actions: ['assignValidUrl', 'enableCaption'],
      //     },
      //     onError: {
      //       target: 'edit.update',
      //       actions: ['assignError'],
      //     },
      //   },
      // },
    },
  },
  {
    actions: {
      // @ts-ignore
      clearError: assign({
        errorMessage: '',
      }),
      // @ts-ignore
      enableCaption: assign({
        captionVisibility: true,
      }),
    },
  },
)
