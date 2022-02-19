import {Link} from '@app/client'
import {createInterpreterContext} from '@app/utils/machine-utils'
import {Interpreter} from 'xstate'
import {createModel} from 'xstate/lib/model'

export const CITATIONS_FETCH = 'CITATIONS.FETCH'
export const CITATIONS_FETCH_SUCCESS = 'CITATIONS.FETCH.SUCCESS'
export const CITATIONS_FETCH_ERROR = 'CITATIONS.FETCH.ERROR'
export const CITATIONS_FETCH_RETRY = 'CITATIONS.FETCH.RETRY'
export const CITATIONS_EXPAND = 'CITATIONS.EXPAND'
export const CITATIONS_COLLAPSE = 'CITATIONS.COLLAPSE'
export const CITATIONS_TOGGLE = 'CITATIONS.TOGGLE'

export const citationsModel = createModel(
  {
    documentId: '',
    version: '',
    citations: [] as Array<Link>,
    errorMessage: '',
  },
  {
    events: {
      [CITATIONS_FETCH]: (documentId: string, version?: string) => ({documentId, version}),
      [CITATIONS_FETCH_SUCCESS]: (citations: Array<Link>) => ({citations}),
      [CITATIONS_FETCH_ERROR]: (errorMessage: Error['message']) => ({errorMessage}),
      [CITATIONS_FETCH_RETRY]: () => ({}),
      [CITATIONS_EXPAND]: () => ({}),
      [CITATIONS_COLLAPSE]: () => ({}),
      [CITATIONS_TOGGLE]: () => ({}),
    },
  },
)

export const citationsMachine = citationsModel.createMachine({
  initial: 'idle',
  context: citationsModel.initialContext,
  on: {
    [CITATIONS_FETCH]: {
      target: 'loading',
      actions: ['assignPublicationIds'],
    },
  },
  states: {
    idle: {},
    loading: {
      invoke: {
        id: 'fetchCitations',
        src: 'fetchCitations',
      },
      on: {
        [CITATIONS_FETCH_SUCCESS]: {
          target: 'ready',
          actions: ['assignCitations'],
        },
        [CITATIONS_FETCH_ERROR]: {
          target: 'errored',
          actions: ['assignErrorMessage'],
        },
      },
    },
    ready: {
      initial: 'collapsed',
      states: {
        expanded: {
          on: {
            [CITATIONS_COLLAPSE]: 'collapsed',
            [CITATIONS_TOGGLE]: 'collapsed',
          },
        },
        collapsed: {
          on: {
            [CITATIONS_EXPAND]: 'expanded',
            [CITATIONS_TOGGLE]: 'expanded',
          },
        },
      },
    },
    errored: {
      on: {
        [CITATIONS_FETCH_RETRY]: {
          target: 'loading',
          actions: ['clearErrorMessage'],
        },
      },
    },
  },
})

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
