import {EditorDocument} from '@app/editor/use-editor-draft'
import {queryKeys} from '@app/hooks'
import {libraryMachine} from '@components/library/library-machine'
import isEqual from 'fast-deep-equal'
import Navaid from 'navaid'
import {QueryClient} from 'react-query'
import {ActorRefFrom, assign, createMachine, send, spawn} from 'xstate'
import {
  createDraft,
  Document,
  listDrafts,
  listPublications,
  Publication,
} from './client'

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
                  .fetchQuery([queryKeys.GET_PUBLICATION_LIST], () =>
                    listPublications(),
                  )
                  .then(function filesResponse(response) {
                    let data = response.publications.map((pub) => ({
                      ...pub,
                      ref: 'TODO',
                    }))
                    sendBack({type: 'REPORT.DATA.SUCCESS', data})
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
  | {type: 'RECONCILE'}

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
                    sendBack({type: 'REPORT.DATA.SUCCESS', data})
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

export type MainPageContext = {
  params: {
    docId: string
    version: string | null
    blockId: string | null
  }
  document: Document | null
  recents: Array<string>
  files: ActorRefFrom<ReturnType<typeof createFilesMachine>>
  drafts: ActorRefFrom<ReturnType<typeof createDraftsMachine>>
  library: ActorRefFrom<typeof libraryMachine>
}

type MainPageEvent =
  | {type: 'RECONCILE'}
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
      type: 'goBack'
    }
  | {
      type: 'goForward'
    }
  | {
      type: 'SET.CURRENT.DOCUMENT'
      document: EditorDocument
    }

export function defaultMainPageContext(
  client: QueryClient,
  overrides: Partial<MainPageContext> = {
    params: {docId: '', version: null, blockId: null},
  },
) {
  return () => ({
    params: {
      docId: '',
      version: null,
      blockId: null,
      ...overrides.params,
    },
    document: null,
    recents: [],
    files: spawn(createFilesMachine(client), 'files'),
    drafts: spawn(createDraftsMachine(client), 'drafts'),
    library: spawn(libraryMachine, 'library'),
    ...overrides,
  })
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
      context: defaultMainPageContext(client),
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
              entry: ['clearCurrentDocument', 'clearParams'],
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
                  exit: ['pushToRecents', 'clearCurrentDocument'],
                  on: {
                    goToEditor: [
                      {
                        cond: 'isEventDifferent',
                        target: 'validating',
                      },
                      {},
                    ],
                    goToPublication: {
                      target: '#publication',
                    },
                  },
                },
                error: {},
              },
              on: {
                'SET.CURRENT.DOCUMENT': {
                  target: undefined,
                  actions: 'setCurrentDocument',
                },
              },
            },
            publication: {
              id: 'publication',
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
                  entry: ['pushPublicationRoute'],
                  exit: ['pushToRecents', 'clearCurrentDocument'],
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
              on: {
                'SET.CURRENT.DOCUMENT': {
                  target: undefined,
                  actions: 'setCurrentDocument',
                },
              },
            },
            settings: {
              tags: ['settings'],
              entry: ['clearCurrentDocument', 'clearParams'],
            },
            createDraft: {
              invoke: {
                src: 'createNewDraft',
              },
            },
          },
          on: {
            RECONCILE: {
              actions: ['updateLibrary'],
            },
            routeNotFound: '.idle',
            goToHome: '.home',
            goToSettings: '.settings',
            goToEditor: {
              target: '.editor',
            },
            goToPublication: {
              target: '.publication',
            },
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
      on: {
        goBack: {
          actions: ['navigateBack'],
        },
        goForward: {
          actions: ['navigateForward'],
        },
      },
    },
    {
      guards: {
        isPublication: (_, event) => event.docType == 'p',
        isDraft: (_, event) => event.docType == 'editor',
        isMetaEventDifferent: (context, _, meta) => {
          console.log('isMetaEventDifferent', context, _, meta)

          let {type, ...eventParams} = meta.state.event
          return !isEqual(context.params, eventParams)
        },
        isEventDifferent: (context, event) => {
          let {type, ...eventParams} = event

          return !isEqual(context.params, eventParams)
        },
      },
      actions: {
        pushToRecents: assign((context, event) => {
          console.log('pushToRecents', {
            location: window.location.pathname,
            context,
            event,
          })
          let _set = new Set<string>(context.recents)
          if (_set.has(window.location.pathname))
            _set.delete(window.location.pathname)
          _set.add(window.location.pathname)
          console.log('result = ', [..._set])
          return {
            recents: [..._set],
          }
        }),
        updateLibrary: (context) => {
          context.files.send('RECONCILE')
          context.drafts.send('RECONCILE')
        },
        setCurrentDocument: assign({
          document: (_, event) => event.document,
        }),
        clearCurrentDocument: assign({
          document: (c) => null,
        }),
        setDraftParams: assign({
          params: (_, e, meta) => {
            let {event} = meta.state
            return {
              docId: event.docId,
            }
          },
        }),
        setPublicationParams: assign({
          params: (c, e, m) => {
            let {replace, type, ...rest} = m.state?.event
            return rest
          },
        }),
        pushPublicationRoute: send(
          (context) => {
            return {
              type: 'pushPublication',
              ...context.params,
            }
          },
          {to: 'router'},
        ),
        pushDraftRoute: send(
          (context, ev, meta) => ({
            type: 'pushDraft',
            docId: context.params.docId,
            blockId: context.params.blockId,
          }),
          {to: 'router'},
        ),
        clearParams: assign((_) => ({
          params: {
            docId: '',
            version: null,
            blockId: null,
          },
        })),
        navigateBack: () => {
          if (!window.history) return
          window.history.back()
        },
        navigateForward: () => {
          if (!window.history) return
          window.history.forward()
        },
      },
      services: {
        router: () => (sendBack, receive) => {
          let navRouter = Navaid('/', () => sendBack('goToHome'))
          // Deserialize events from the URL
          navRouter
            .on('/', () => {
              console.log('ENTER IN HOME ROUTE')
              sendBack('goToHome')
            })
            .on('/settings', () => {
              console.log('ENTER IN SETTINGS ROUTE')
              sendBack('goToSettings')
            })
            .on<{docId: string}>('/editor/:docId', (params) => {
              console.log('ENTER IN EDITOR ROUTE', params)

              return params
                ? sendBack({type: 'goToEditor', ...params})
                : sendBack('routeNotFound')
            })
            .on<{
              docId: string
              version?: string
              blockId?: string
            }>('/p/:docId/:version?/:blockid?', (params) => {
              console.log('ENTER IN PUBLICATION ROUTE: ', params)

              return params
                ? sendBack({
                    type: 'goToPublication',
                    docId: params.docId,
                    version: params.version,
                    blockId: params.blockId,
                  })
                : sendBack('routeNotFound')
            })
            .on<{
              docType?: string
              docId?: string
              version?: string
              blockId?: string
            }>('/new/:docType?/:docId?/:version?/:blockId?', (params) => {
              sendBack({type: 'goToNew', ...params})
            })

          receive((event) => {
            if (event.type == 'pushHome') {
              navRouter.route('/')
            } else if (event.type == 'pushPublication') {
              navRouter.route(
                `/p/${event.docId}${
                  event.version
                    ? `/${event.version}${
                        event.blockId ? `/${event.blockId}` : ''
                      }`
                    : ''
                }`,
                event.replace,
              )
            } else if (event.type == 'pushDraft') {
              navRouter.route(
                `/editor/${event.docId}${
                  event.blockId ? `/${event.blockId}` : ''
                }`,
                event.replace,
              )
            } else if (event.type == 'goToSettings') {
              navRouter.route('/settings')
            }
          })

          navRouter.listen()

          return () => navRouter?.unlisten()
        },
        createNewDraft: () => (sendBack) => {
          createDraft().then((document) => {
            sendBack({type: 'goToEditor', docId: document.id})
          })
        },
      },
    },
  )
}
