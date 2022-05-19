import {Link, listCitations} from '@app/client'
import {queryKeys} from '@app/hooks'
import {createInterpreterContext} from '@app/utils/machine-utils'
import {QueryClient} from 'react-query'
import {assign, createMachine, InterpreterFrom} from 'xstate'

export function createCitationsMachine(client: QueryClient) {
  return createMachine(
    {
      context: {documentId: '', version: '', citations: [], errorMessage: ''},
      tsTypes: {} as import('./citations.typegen').Typegen0,
      schema: {
        context: {} as {
          documentId: string
          version: string
          citations: Array<Link>
          errorMessage: string
        },
        events: {} as CitationEvent,
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            'CITATIONS.FETCH': {
              actions: ['assignDocumentId', 'assignVersion'],
              target: 'loading',
            },
          },
        },
        loading: {
          invoke: {
            src: 'fetchCitations',
            id: 'fetchCitations',
          },
          on: {
            'CITATIONS.FETCH.SUCCESS': {
              actions: 'assignCitations',
              target: 'ready',
            },
            'CITATIONS.FETCH.ERROR': {
              actions: 'assignErrorMessage',
              target: 'errored',
            },
          },
        },
        ready: {
          initial: 'collapsed',
          states: {
            expanded: {
              on: {
                'CITATIONS.COLLAPSE': {
                  target: 'collapsed',
                },
                'CITATIONS.TOGGLE': {
                  target: 'collapsed',
                },
              },
            },
            collapsed: {
              on: {
                'CITATIONS.EXPAND': {
                  target: 'expanded',
                },
                'CITATIONS.TOGGLE': {
                  target: 'expanded',
                },
              },
            },
          },
        },
        errored: {
          on: {
            'CITATIONS.FETCH.RETRY': {
              actions: 'clearErrorMessage',
              target: 'loading',
            },
          },
        },
      },
    },
    {
      actions: {
        assignDocumentId: assign({
          documentId: (_, event) => event.documentId,
        }),
        assignVersion: assign({
          version: (_, event) => event.version || '',
        }),
        assignCitations: assign({
          citations: (_, event) => event.citations,
        }),
        assignErrorMessage: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        clearErrorMessage: assign({
          errorMessage: (context) => '',
        }),
      },
      services: {
        fetchCitations: (context) => (sendBack) => {
          client.fetchQuery(
            [
              queryKeys.GET_PUBLICATION_ANNOTATIONS,
              context.documentId,
              context.version,
            ],
            async () => {
              try {
                let resp = await listCitations(context.documentId)
                sendBack({
                  type: 'CITATIONS.FETCH.SUCCESS',
                  citations: resp.links,
                })
              } catch (error) {
                sendBack({
                  type: 'CITATIONS.FETCH.ERROR',
                  errorMessage: `Fetch Citations error: ${error}`,
                })
              }
            },
          )
        },
      },
    },
  )
}

const [CitationsProvider, useCitationService, createCitationsSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createCitationsMachine>>
  >('Citation')

export {CitationsProvider, useCitationService}

//@ts-ignore
export const useCitations = createCitationsSelector<Array<Link>>(
  (state) => state.context.citations,
)

export function useBlockCitations(blockId: string) {
  let citations = useCitations()

  if (citations.length) {
    return citations.filter((link: Link) => link.target?.blockId == blockId)
  }

  return []
}

export type CitationEvent =
  | {type: 'CITATIONS.FETCH'; documentId: string; version?: string}
  | {
      type: 'CITATIONS.FETCH.SUCCESS'
      citations: Array<Link>
    }
  | {
      type: 'CITATIONS.FETCH.ERROR'
      errorMessage: Error['message']
    }
  | {
      type: 'CITATIONS.FETCH.RETRY'
    }
  | {
      type: 'CITATIONS.EXPAND'
    }
  | {
      type: 'CITATIONS.COLLAPSE'
    }
  | {
      type: 'CITATIONS.TOGGLE'
    }
