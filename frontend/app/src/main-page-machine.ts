import { queryKeys } from '@app/hooks'
import { libraryMachine } from '@components/library/library-machine'
import { QueryClient } from 'react-query'
import { ActorRefFrom, assign, createMachine, spawn } from 'xstate'
import { Document, listDrafts, listPublications, Publication } from './client'

export function createFilesMachine(client: QueryClient) {
  return createMachine({
    tsTypes: {} as import("./main-page-machine.typegen").Typegen0,
    schema: {
      context: {} as FilesContext<Publication>,
      events: {} as FilesEvent<Publication>
    },
    initial: 'idle',
    context: {
      data: []
    },
    states: {
      idle: {
        invoke: [
          {
            src: () => (sendBack) => {
              client
                .fetchQuery([queryKeys.GET_PUBLICATION_LIST], () => listPublications())
                .then(function filesResponse(response) {
                  let data = response.publications.map((pub) => ({
                    ...pub,
                    ref: 'TODO',
                  }))
                  sendBack({ type: 'REPORT.DATA.SUCCESS', data })
                })
            },
          },
        ],
        on: {
          'REPORT.DATA.SUCCESS': {
            actions: 'assignData',
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
  }, {
    actions: {
      assignData: assign({
        data: (_, event) => event.data
      })
    }
  })
}

export type DraftRef = Document & {
  ref: string // TODO: ActorRefFrom<ReturnType<typeof createDraftMachine>>
}

type FilesContext<T = any> = {
  data: Array<T>
}

type FilesEvent<T = any> = {
  type: 'REPORT.DATA.SUCCESS'; data: Array<T>
} | { type: "RECONCILE" }


function createDraftsMachine(client: QueryClient) {
  return createMachine({
    tsTypes: {} as import("./main-page-machine.typegen").Typegen1,
    schema: {
      context: {} as FilesContext<Document>,
      events: {} as FilesEvent<Document>
    },
    initial: 'idle',
    context: {
      data: []
    },
    states: {
      idle: {
        invoke: [
          {
            src: () => (sendBack) => {
              client
                .fetchQuery([queryKeys.GET_DRAFT_LIST], () => listDrafts())
                .then(function filesResponse(response) {
                  let data = response.documents.map((doc) => ({
                    ...doc,
                    ref: 'TODO',
                  }))
                  sendBack({ type: 'REPORT.DATA.SUCCESS', data })
                })
            },
          },
        ],
        on: {
          'REPORT.DATA.SUCCESS': {
            actions: 'assignData',
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
  }, {
    actions: {
      assignData: assign({
        data: (_, event) => event.data
      })
    }
  })
}

type MainPageContext = {
  files: ActorRefFrom<ReturnType<typeof createFilesMachine>>;
  drafts: ActorRefFrom<ReturnType<typeof createDraftsMachine>>;
  library: ActorRefFrom<typeof libraryMachine>;
}

type MainPageEvent = { type: 'RECONCILE' }

export function createMainPageMachine(client: QueryClient) {
  return createMachine({
    tsTypes: {} as import("./main-page-machine.typegen").Typegen2,
    schema: {
      context: {} as MainPageContext,
      events: {} as MainPageEvent
    },
    initial: 'idle',
    context: () => ({
      files: spawn(createFilesMachine(client), 'files'),
      drafts: spawn(createDraftsMachine(client), 'drafts'),
      library: spawn(libraryMachine, 'library'),
    }),
    states: {
      idle: {
        on: {
          RECONCILE: {
            actions: 'reconcileLibrary'
          }
        }
      },
    },
  })
}
