import {Link} from '@app/client'
import {createInterpreterContext} from '@app/utils/machine-utils'
import {createMachine, Interpreter} from 'xstate'

export const citationsMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgBsB7dCAqAYgGEBJAFQEEWmB5AOQGUSAMQCiLBgAkSfAKoMGwvn0SgADhVi4ALrgr5lIAB6IATAAYAHCQAsARisA2AOwBmWwE4bAVnPP7AGhAAT0QAWmdTElMrYytwt2NPN19TZwBfVIC0LDxCUkpqWkZWDm5+IVEJEmEAJWquav01DW1dfSMEMMcrEmMvTxsXBMdjFwDgjqtzSzNzK0cU43NTUyTPdMyMHAJiEgAnMGpAkjADFXR8CEgi9k5eAQYuABlHtgAFPmFG9S0dPSRDRD2cxuEi+TzOeZWbyeFJjUL2CJQqJWUxA8yeGGuKzrEBZLa5PYHCBHE5nC5XZg3UoCFhcADidMen3+TR+rX+7XmnhIjjcjns4M89l6nlicI6CQiziFjmBGOi-JsOLxOR2+0OJEwFDIZHQKlgFOKtzKwgAGq82DwACJfZq-NqA4GggUQqLQ2FBUI2cyOSKipzOYwC+YWRzKzaq0jq4ma7W6-WGql3Ei0hlM21sv6gdpAkFg11Q9Ee8YhGzGZw8zwJIV8xxloXYjK4iPbUhgXa7Cj7CDXErJkRiSTVUTVACaGZaWYBEtFlccw2Wdlsg3Fpb5JCrwvMZd55hFYabKtbveNAgHEgn9o5oRi0xRELcPjcczsq6DJHRiS8dbsopSaxxfAKEueB-iPAlcAgMgwEvdls1CCEK0cGEg2MEZjHiatV0DYwSG9FxA1MfD+iScNslbcgqBofAoFgqd2jCEh7AfBx7BsIFwRiAZV29GwmOrJY3GY58bDcNwyPxNUiRJU5zkuCA6IdBB4m5AUrELex7GiRI3B4lxQX5edn2BCw3FMYwJMjQkNS1HU9QNBSWW+SclNFX1XAsH0XF-NC32cPj7HifzpSSPdmPsSyKOjcZVGcq94IQKsKw8qZ538qFfM9DpA2SxZ2JsZxHyhUUAI2ciCXbTtu0U69soFHp4kC-zvGMzxHD0isnGiNjvG89TItyGqErCR8ej6AZAzakZnFXNqKwGIremGb1zAi9JUiAA */
  createMachine(
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
              actions: 'assignPublicationIds',
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
        assignPublicationIds: (_, event) => ({
          documentId: event.documentId,
          version: event.version,
        }),
      },
    },
  )

const [CitationsProvider, useCitationService, createCitationsSelector] =
  createInterpreterContext<Interpreter<typeof citationsMachine>>('Citation')

export {CitationsProvider, useCitationService}

//@ts-ignore
export const useCitations = createCitationsSelector<Array<Link>>((state) => state.context.citations)

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
