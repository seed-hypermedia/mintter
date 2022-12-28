import {createMachine} from 'xstate'

export const commentsMachine = createMachine({
  id: 'comments-machine',

  states: {
    idle: {
      description: `All the selection capture will not happen here, but in the actual editor comments plugin. we can then call this machine from the hovering toolbar "commnent" button`,

      on: {
        'CONVERSATION.SELECTION': 'selectionCaptured',
      },
    },

    selectionCaptured: {
      on: {
        'CONVERSATION.SUBMIT': 'submitting',
        'CONVERSATION.BLUR': 'idle',
      },

      description: `In this state, we need to show the comment bubble and also an invisible overlay, so we can capture clicks outside of the whole comment bubble and dismiss it`,
    },

    submitting: {
      invoke: {
        src: 'submitConversation',
        id: 'submitConversation',
        onDone: {
          target: 'submited',
        },
      },

      description: `Here we invoke the grpc calls to create the new conversation`,
    },

    submited: {
      type: 'final',
    },
  },

  initial: 'idle',
})
