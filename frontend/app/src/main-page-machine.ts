import { queryKeys } from '@app/hooks'
import { libraryMachine } from '@components/library/library-machine'
import Navaid from 'navaid'
import { QueryClient } from 'react-query'
import { ActorRefFrom, assign, createMachine, send, spawn } from 'xstate'
import { createDraft, Document, listDrafts, listPublications, Publication } from './client'

export function createFilesMachine(client: QueryClient) {
  return createMachine(
    {
      tsTypes: {} as import('./main-page-machine.typegen').Typegen0,
      schema: {
        context: {} as FilesContext<Publication>,
        events: {} as FilesEvent<Publication>,
      },
      initial: 'idle',
      context: {
        data: [],
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
    },
    {
      actions: {
        assignData: assign({
          data: (_, event) => event.data,
        }),
      },
    },
  )
}

export type DraftRef = Document & {
  ref: string // TODO: ActorRefFrom<ReturnType<typeof createDraftMachine>>
}

type FilesContext<T = any> = {
  data: Array<T>
}

type FilesEvent<T = any> =
  | {
    type: 'REPORT.DATA.SUCCESS'
    data: Array<T>
  }
  | { type: 'RECONCILE' }

function createDraftsMachine(client: QueryClient) {
  return createMachine(
    {
      tsTypes: {} as import('./main-page-machine.typegen').Typegen1,
      schema: {
        context: {} as FilesContext<Document>,
        events: {} as FilesEvent<Document>,
      },
      initial: 'idle',
      context: {
        data: [],
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
    },
    {
      actions: {
        assignData: assign({
          data: (_, event) => event.data,
        }),
      },
    },
  )
}

type MainPageContext = {
  params: {
    docId: string
    version?: string
    blockId?: string
  }
  files: ActorRefFrom<ReturnType<typeof createFilesMachine>>
  drafts: ActorRefFrom<ReturnType<typeof createDraftsMachine>>
  library: ActorRefFrom<typeof libraryMachine>
}

type MainPageEvent =
  | { type: 'RECONCILE' }
  | {
    type: 'routeNotFound'
  }
  | {
    type: 'goToEditor'
    docId: string
  }
  | {
    type: 'goToPublication'
    docId: string
    version?: string
    blockId?: string
    replace?: boolean
  }
  | {
    type: 'goToSettings'
  }
  | {
    type: 'goToHome'
  }
  | {
    type: 'goToNew'
    docType?: string
    docId?: string
    version?: string
    blockId?: string
  }
  | {
    type: 'toNewDraft'
  }
  | {
    type: 'navigateBack'
  }
  | {
    type: 'navigateForward'
  }

export function createMainPageMachine(client: QueryClient) {
  return createMachine(
    {
      tsTypes: {} as import('./main-page-machine.typegen').Typegen2,
      schema: {
        context: {} as MainPageContext,
        events: {} as MainPageEvent,
      },
      initial: 'routes',
      context: () => ({
        params: {
          docId: '',
          version: undefined,
          blockId: undefined,
        },
        files: spawn(createFilesMachine(client), 'files'),
        drafts: spawn(createDraftsMachine(client), 'drafts'),
        library: spawn(libraryMachine, 'library'),
      }),
      invoke: {
        src: 'router',
        id: 'router',
      },
      states: {
        routes: {
          initial: 'idle',
          states: {
            idle: {},
            home: {
              tags: ['topbar', 'library'],
            },
            editor: {
              tags: ['topbar', 'library', 'sidepanel'],
              initial: 'validating',
              states: {
                validating: {
                  always: [
                    {
                      cond: 'isMetaEventDifferent',
                      target: 'valid',
                      actions: ['setDraftParams'],
                    },
                  ],
                },
                valid: {
                  tags: ['draft'],
                  entry: ['pushDraftRoute'],
                  on: {
                    goToEditor: [
                      {
                        cond: 'isEventDifferent',
                        target: 'validating',
                      },
                      {},
                    ],
                  },
                },
                error: {},
              },
            },
            publication: {
              initial: 'validating',
              tags: ['topbar', 'library', 'sidepanel'],
              states: {
                validating: {
                  always: [
                    {
                      cond: 'isMetaEventDifferent',
                      target: 'valid',
                      actions: ['setPublicationParams'],
                    },
                    {
                      target: 'error',
                    },
                  ],
                },
                valid: {
                  tags: ['publication'],
                  entry: ['pushPublicationToRoute'],
                  on: {
                    goToPublication: [
                      {
                        cond: 'isEventDifferent',
                        target: 'validating',
                      },
                      {},
                    ],
                  },
                },
                error: {
                  type: 'final',
                },
              },
              onDone: 'idle',
            },
            settings: {
              tags: [],
            },
            createDraft: {
              invoke: {
                src: 'createNewDraft',
              },
            },
          },
          on: {
            RECONCILE: {
              actions: 'reconcileLibrary',
            },
            routeNotFound: '.idle',
            goToHome: '.home',
            goToSettings: '.settings',
            goToEditor: '.editor',
            goToPublication: '.publication',
            goToNew: [
              {
                cond: 'isPublication',
                target: '.publication',
              },
              {
                cond: 'isDraft',
                target: '.editor',
              },
              {
                target: '.createDraft',
              },
            ],
            toNewDraft: '.createDraft',
          },
        },
      },
    },
    {
      guards: {
        isPublication: (_, event) => event.docType == 'p',
        isDraft: (_, event) => event.docType == 'editor',
        isMetaEventDifferent: (context, _, meta) => context.params.docId != meta.state.event.docId,
        isEventDifferent: (context, event) => context.params.docId != event.docId,
      },
      actions: {
        setDraftParams: assign({
          params: (_, e, meta) => {
            let { event } = meta.state
            return {
              docId: event.docId,
              blockId: event.bl
            }
          },
        }),
        setPublicationParams: assign({
          params: (c, e, m) => {
            let { replace, type, ...rest } = m.state?.event
            return rest
          },
        }),
        pushPublicationToRoute: send(
          (context) => ({
            type: 'pushPublication',
            ...context.params,
          }),
          { to: 'router' },
        ),
        pushDraftRoute: send((context, ev, meta) => ({
          type: 'pushDraft',
          docId: context.params.docId,
          blockId: context.params.blockId
        }), { to: 'router' })
      },
      services: {
        router: () => (sendBack, receive) => {
          let navRouter = Navaid('/', () => sendBack('goToHome'))
          // Deserialize events from the URL
          navRouter
            .on('/', () => sendBack('goToHome'))
            .on('/settings', () => sendBack('goToSettings'))
            .on<{ docId: string }>('/editor/:docId', (params) =>
              params ? sendBack({ type: 'goToEditor', docId: params.docId }) : sendBack('routeNotFound'),
            )
            .on<{
              docId: string
              version?: string
              blockId?: string
            }>('/p/:docId/:version?/:blockid?', (params) =>
              params
                ? sendBack({
                  type: 'goToPublication',
                  docId: params.docId,
                  version: params.version,
                  blockId: params.blockId,
                })
                : sendBack('routeNotFound'),
            )
            .on<{
              docType?: string
              docId?: string
              version?: string
              blockId?: string
            }>('/new/:docType?/:docId?/:version?/:blockId?', (params) => {
              sendBack({ type: 'goToNew', ...params })
            })

          receive((event) => {
            if (event.type == 'pushHome') {
              navRouter.route('/')
            } else if (event.type == 'pushPublication') {
              navRouter.route(
                `/p/${event.docId}${event.version ? `/${event.version}${event.blockId ? `/${event.blockId}` : ''}` : ''
                }`,
                event.replace,
              )
            } else if (event.type == 'pushDraft') {
              navRouter.route(`/editor/${event.docId}${event.blockId ? `/${event.blockId}` : ''}`, event.replace)
            } else if (event.type == 'goToSettings') {
              navRouter.route('/settings')
            }
          })

          navRouter.listen()

          return () => navRouter?.unlisten()
        },
        createNewDraft: () => (sendBack) => {
          console.log('createNewDraft invoked!')

          createDraft().then((document) => {
            sendBack({ type: 'goToEditor', docId: document.id })
          })
        },
      },
    },
  )
}
