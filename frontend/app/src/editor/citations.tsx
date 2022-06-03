import {Link} from '@app/client'
import {createInterpreterContext} from '@app/utils/machine-utils'
import {assign, createMachine, InterpreterFrom} from 'xstate'

export var citationMachine = createMachine(
  {
    context: {link: undefined},
    tsTypes: {} as import('./citations.typegen').Typegen0,
    schema: {
      context: {} as {
        link: Link | undefined
      },
      events: {} as CitationEvent,
    },
    id: '(machine)',
    initial: 'idle',
    states: {
      idle: {
        on: {
          LOAD: {
            actions: ['assignLink'],
          },
          CLEAR: {
            actions: ['clearLink'],
          },
        },
      },
    },
  },
  {
    actions: {
      assignLink: assign({
        link: (_, event) => event.link,
      }),
      clearLink: assign({
        link: (c) => undefined,
      }),
    },
  },
)

const [CitationProvider, useCitationService, createCitationsSelector] =
  createInterpreterContext<InterpreterFrom<typeof citationMachine>>('Citation')

export {CitationProvider, useCitationService}

//@ts-ignore
export const useCitation = createCitationsSelector<Link | undefined>(
  (state) => state.context.link,
)

export type CitationEvent =
  | {type: 'LOAD'; link: Link}
  | {
      type: 'CLEAR'
    }
