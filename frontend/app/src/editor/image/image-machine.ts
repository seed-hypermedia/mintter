import {assign, createMachine} from 'xstate'

type ImageContext = {
  errorMessage: string
  captionVisibility: boolean
}

type ImageEvent =
  | {type: 'IMAGE.REPLACE'}
  | {type: 'IMAGE.SUBMIT'; value: string}
  | {type: 'IMAGE.CANCEL'}
  | {type: 'REPORT.IMAGE.VALID'}
  | {type: 'REPORT.IMAGE.INVALID'}
  | {type: 'CAPTION.UPDATE'; value: string}

type ImageServices = {
  validateUrlService: {
    data: string | undefined
  }
}

export const imageMachine = createMachine(
  {
    predictableActionArguments: true,
    tsTypes: {} as import('./image-machine.typegen').Typegen0,
    schema: {
      context: {} as ImageContext,
      events: {} as ImageEvent,
      services: {} as ImageServices,
    },
    id: 'imageMachine',
    description:
      'Context: caption, imageURL (the image imput should be uncontrolled)',
    context: {
      errorMessage: '',
      captionVisibility: false,
    },
    initial: 'checking',
    states: {
      checking: {
        always: [
          {
            cond: 'hasImageUrl',
            target: 'image',
          },
          {
            target: 'edit.new',
          },
        ],
      },
      image: {
        entry: ['assignCaptionVisibility'],
        on: {
          'IMAGE.REPLACE': {
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
              'IMAGE.CANCEL': {
                target: '#imageMachine.image',
              },
            },
          },
        },
        on: {
          'IMAGE.SUBMIT': {
            target: 'submitting',
          },
        },
      },
      submitting: {
        entry: ['clearError'],
        invoke: {
          src: 'validateUrlService',
          id: 'validateUrlService',
          onDone: {
            target: 'image',
            actions: ['assignValidUrl', 'enableCaption'],
          },
          onError: {
            target: 'edit.update',
            actions: ['assignError'],
          },
        },
      },
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
