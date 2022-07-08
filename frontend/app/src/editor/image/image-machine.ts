import {assign, createMachine} from 'xstate'

type ImageContext = {
  errorMessage: string
  captionVisibility: boolean
}

type ImageEvent =
  | {type: 'IMAGE.REPLACE'}
  | {type: 'IMAGE.SUBMIT'; value: string}
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
    tsTypes: {} as import('./image-machine.typegen').Typegen0,
    schema: {
      context: {} as ImageContext,
      events: {} as ImageEvent,
      services: {} as ImageServices,
    },
    id: 'Image Element',
    description:
      'Context: caption, imageURL (the image imput should be uncontrolled)',
    context: {
      errorMessage: '',
      captionVisibility: false,
    },
    initial: 'init',
    states: {
      init: {
        always: [
          {
            cond: 'hasImageUrl',
            target: 'image',
          },
          {
            target: 'editImage',
          },
        ],
      },
      image: {
        entry: ['assignCaptionVisibility'],
        on: {
          'IMAGE.REPLACE': {
            target: 'editImage',
          },
          'CAPTION.UPDATE': {
            actions: ['updateCaption'],
          },
        },
      },
      editImage: {
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
            target: 'editImage',
            actions: ['assignError'],
          },
        },
      },
    },
  },
  {
    actions: {
      clearError: assign({
        errorMessage: (c) => '',
      }),
      enableCaption: assign({
        captionVisibility: (c) => true,
      }),
    },
  },
)
