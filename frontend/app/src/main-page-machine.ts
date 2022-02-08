import {queryKeys} from '@app/hooks'
import {libraryMachine} from '@components/library/library-machine'
import {QueryClient} from 'react-query'
import {createMachine, spawn} from 'xstate'
import {createModel} from 'xstate/lib/model'
import {Document, listDrafts, listPublications, Publication} from './client'

let filesModel = createModel(
  {
    data: [] as Array<Publication>,
  },
  {
    events: {
      'REPORT.DATA.SUCCESS': (data: Array<Publication>) => ({data}),
      RECONCILE: () => ({}),
    },
  },
)

export function createFilesMachine(client: QueryClient) {
  return filesModel.createMachine({
    initial: 'idle',
    context: filesModel.initialContext,
    states: {
      idle: {
        invoke: [
          {
            src: () => (sendBack) => {
              client
                .fetchQuery([queryKeys.GET_PUBLICATION_LIST], () => listPublications())
                .then(function filesResponse(response) {
                  let items = response.publications.map((pub) => ({
                    ...pub,
                    ref: 'TODO',
                  }))
                  sendBack(filesModel.events['REPORT.DATA.SUCCESS'](items))
                })
            },
          },
        ],
        on: {
          'REPORT.DATA.SUCCESS': {
            actions: filesModel.assign({
              data: (_, event) => event.data,
            }),
            target: 'ready',
          },
        },
      },
      ready: {
        on: {
          RECONCILE: 'idle',
        },
      },
    },
  })
}

export type DraftRef = Document & {
  ref: string // TODO: ActorRefFrom<ReturnType<typeof createDraftMachine>>
}

let draftsModel = createModel(
  {
    data: [] as Array<DraftRef>,
  },
  {
    events: {
      'REPORT.DATA.SUCCESS': (data: Array<DraftRef>) => ({data}),
      RECONCILE: () => ({}),
    },
  },
)

function createDraftsMachine(client: QueryClient) {
  return draftsModel.createMachine({
    initial: 'idle',
    context: draftsModel.initialContext,
    states: {
      idle: {
        invoke: [
          {
            src: () => (sendBack) => {
              client
                .fetchQuery([queryKeys.GET_DRAFT_LIST], () => listDrafts())
                .then(function filesResponse(response) {
                  let items = response.documents.map((doc) => ({
                    ...doc,
                    ref: 'TODO',
                  }))
                  sendBack(draftsModel.events['REPORT.DATA.SUCCESS'](items))
                })
            },
          },
        ],
        on: {
          'REPORT.DATA.SUCCESS': {
            actions: draftsModel.assign({
              data: (_, event) => event.data,
            }),
            target: 'ready',
          },
        },
      },
      ready: {
        on: {
          RECONCILE: 'idle',
        },
      },
    },
  })
}

let publicationModel = createModel(
  {
    document: undefined as Document | undefined,
    version: '',
    latestVersion: '',
  },
  {
    events: {},
  },
)

export function createMainPageMachine(client: QueryClient) {
  return createMachine({
    initial: 'idle',
    context: () => ({
      files: spawn(createFilesMachine(client), 'files'),
      drafts: spawn(createDraftsMachine(client), 'drafts'),
      library: spawn(libraryMachine, 'library'),
    }),
    states: {
      idle: {},
    },
  })
}
