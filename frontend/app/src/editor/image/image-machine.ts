import {assign, createMachine} from 'xstate'

type ImageContext = {
  errorMessage: string
  url: string
}

type ImageEvent =
  | {type: 'IMAGE.REPLACE'}
  | {type: 'IMAGE.SUBMIT'; value: string}
  | {type: 'REPORT.IMAGE.VALID'}
  | {type: 'REPORT.IMAGE.INVALID'}
  | {type: 'CAPTION.UPDATE'; value: string}

export const imageMachine = createMachine(
  {
    tsTypes: {} as import('./image-machine.typegen').Typegen0,
    schema: {context: {} as ImageContext, events: {} as ImageEvent},
    id: 'Image Element',
    description:
      'Context: caption, imageURL (the image imput should be uncontrolled)',
    context: {
      errorMessage: '',
      url: '',
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
          src: 'validateImageUrl',
          id: 'validateImageUrl',
          onDone: {
            target: 'image',
            actions: ['assignValidUrl'],
          },
          onError: {
            target: 'editImage',
            actions: [
              () => {
                console.log('ERROR!!')
              },
              'assignImageNotValidError',
            ],
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
    },
  },
)
