import {createMachine} from 'xstate'

type ImageContext = Record<string, never>
type ImageEvent =
  | {type: 'IMAGE.SUBMIT'}
  | {type: 'IMAGE.DISMISS'}
  | {
      type: 'IMAGE.REPLACE'
    }
  | {type: 'CAPTION.UPDATE'; value: string}
  | {type: 'CAPTION.BLUR'}
  | {type: 'CAPTION.EDIT'}

export const imageMachine = createMachine({
  tsTypes: {} as import('./image-machine.typegen').Typegen0,
  schema: {
    context: {} as ImageContext,
    events: {} as ImageEvent,
  },
  id: 'Image Element',
  initial: 'init',
  description:
    'Context: caption, imageURL (the image imput should be uncontrolled)',

  states: {
    init: {
      always: [
        {
          cond: 'isImageURL',
          target: 'idle',
        },
        {
          target: 'edit',
        },
      ],
    },
    edit: {
      on: {
        'IMAGE.SUBMIT': [
          {
            cond: 'isImageURL',
            target: 'idle',
          },
          {
            actions: 'assignError',
          },
        ],
        'IMAGE.DISMISS': {
          target: 'idle',
        },
      },
    },
    idle: {
      initial: 'captionActive',
      states: {
        captionActive: {
          on: {
            'CAPTION.UPDATE': {
              actions: 'updateCaption',
            },
            'CAPTION.BLUR': {
              target: 'captionInactive',
            },
          },
        },
        captionInactive: {
          on: {
            'CAPTION.EDIT': {
              // actions: 'showCaption',
              target: 'captionActive',
            },
          },
        },
      },
      on: {
        'IMAGE.REPLACE': {
          target: 'edit',
        },
      },
    },
  },
})
