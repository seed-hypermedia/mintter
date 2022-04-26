import { queryKeys } from '@app/hooks'
import { libraryMachine } from '@components/library/library-machine'
import Navaid from "navaid"
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
  | { type: 'goHome' }
  | {
    type: 'routeNotFound'
  }
  | {
    type: 'goToEditor',
    docId: string
    blockId?: string
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
  } | {
    type: 'goToNew',
    docType?: string
    docId: string | null,
    version?: string
    blockId?: string
    replace?: boolean
  } | {
    type: 'createNewDraft'
  }

type RouteEvent = {
  type: 'pushHome'
} | {
  type: 'pushSettings'
} | {
  type: 'pushDraft'
  docId: string
  blockId?: string
} | {
  type: 'pushPublication'
  docId: string
  version?: string
  blockId?: string
  replace?: boolean
}

export function createMainPageMachine(client: QueryClient) {
  let mainPageMachine = createMachine({
    context: () => ({
      params: {
        docId: '',
      },
      files: spawn(createFilesMachine(client), 'files'),
      drafts: spawn(createDraftsMachine(client), 'drafts'),
      library: spawn(libraryMachine, 'library'),
    }),
    tsTypes: {} as import('./main-page-machine.typegen').Typegen2,
    schema: { context: {} as MainPageContext, events: {} as MainPageEvent },
    invoke: {
      src: 'router',
      id: 'router'
    },
    id: 'main page',
    initial: 'routes',
    states: {
      routes: {
        initial: 'idle',
        states: {
          idle: {},
          home: {
            // entry: ['pushHomeRoute'],
            tags: ['topbar', 'library'],
            on: {
              goHome: {
                target: undefined,
                actions: ['pushHomeRoute']
              }
            }
          },
          editor: {
            on: {
              'goToEditor': {
                target: undefined,
                actions: ['pushDraftRoute']
              }
            },
            tags: ['topbar', 'library', 'sidepanel'],
          },
          publication: {
            initial: 'validating',
            states: {
              validating: {
                always: [{
                  cond: 'isPublicationValid',
                  target: 'valid',
                  actions: ['setPublicationParams'],
                }, {
                  target: 'error'
                }]
              },
              valid: {
                tags: ['topbar', 'library', 'sidepanel', 'publication'],
                entry: ['pushPublicationRoute'],
                on: {
                  goToPublication: undefined
                }
              },
              error: {},
            },

          },
          settings: {
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
          routeNotFound: {
            target: '.idle',
          },
          goToSettings: {
            target: '.settings',
          },
          goToEditor: {
            actions: ['setEditorParams'],
            target: '.editor',
          },
          goToPublication: {
            target: '.publication',
          },
          goHome: {
            target: '.home',
          },
          goToNew: [
            {
              actions: 'setPublicationParams',
              cond: 'isPublication',
              target: '.publication',
            },
            {
              actions: 'setEditorParams',
              cond: 'isDraft',
              target: '.editor',
            },
            {
              target: '.createDraft',
            },
          ],
          createNewDraft: {
            target: '.createDraft',
          },
        },
      },
    },
  }, {
    guards: {
      isPublication: (_, event) => event.docType == 'p',
      isPublicationValid: (context, _, meta) => {
        let { event } = meta.state
        console.log('isPublicationValid: ', { event, context });

        //@ts-ignore
        if (event.type != 'goToPublication') return false
        //@ts-ignore
        return event.docId != context.params.docId || event.version != context.params.version
      },
      isDraft: (_, event) => event.docType == 'editor'
    },
    actions: {
      setEditorParams: assign({
        params: (_, event) => ({
          docId: event.docId
        })
      }),
      setPublicationParams: assign({
        params: (_, ev, meta) => {
          console.log('setPublicationParams', meta);
          let { event } = meta.state
          send<{}, RouteEvent>({
            type: 'pushPublication',
            docId: event.docId,
            version: event.version,
            blockId: event.blockId
          }, { to: 'router' })
          return {
            docId: event.docId,
            version: event.version,
            blockId: event.blockId

          }
        }
      }),
      pushDraftRoute: send(context => ({
        type: 'pushDraft',
        docId: context.params.docId,
        blockId: context.params.blockId
      }), { to: 'router' }),
      pushPublicationRoute: () => {
        send<MainPageContext, MainPageEvent>((context, event) => {
          console.log('PUSH PUBLICATION ROUTE', event);
          return {
            type: 'pushPublication',
            ...context.params,
            replace: event.replace
          }
        }, { to: 'router' })
      },
      pushSettingsRoute: send('pushSettings', { to: 'router' }),
      pushHomeRoute: send('pushHome', { to: 'router' }),
    },
    services: {
      router: () => (sendBack, receive) => {
        let navRouter = Navaid('/', () => sendBack('goHome'))

        // Deserialize events from the URL
        navRouter
          .on('/', () => sendBack('goHome'))
          .on('/settings', () => sendBack('goToSettings'))
          .on<{ docId: string }>('/editor/:docId', (params) => params ? sendBack({ type: 'goToEditor', docId: params.docId }) : sendBack('routeNotFound'))
          .on<{
            docId: string
            version?: string
            blockId?: string
          }>('/p/:docId/:version?/:blockid?', (params) => params ? sendBack({ type: 'goToPublication', docId: params.docId, version: params.version, blockId: params.blockId }) : sendBack('routeNotFound'))
          .on<{
            docType?: string
            docId: string | null
            version?: string
            blockId?: string
          }>('/new/:docType?/:docId?/:version?/:blockId?', (params) => {
            sendBack({ type: 'goToNew', docId: null, ...params })
          })


        receive((event: RouteEvent) => {
          console.log('RECEIVE EVENT', event);

          if (event.type == 'pushHome') {
            navRouter.route('/')
          } else if (event.type == 'pushSettings') {
            navRouter.route('/settings')
          } else if (event.type == 'pushPublication') {
            navRouter.route(`/p/${event.docId}${event.version ? `/${event.version}${event.blockId ? `/${event.blockId}` : ""}` : ""}`, event.replace)
          } else if (event.type == 'pushDraft') {
            navRouter.route(`/editor/${event.docId}${event.blockId ? `/${event.blockId}` : ""}`)
          }
        })

        navRouter.listen()

        return () => navRouter?.unlisten?.()
      },
      createNewDraft: () => (sendBack) => {
        console.log('createNewDraft invoked!');

        createDraft().then(document => {
          sendBack({ type: 'goToEditor', docId: document.id })
        })

      }
    }
  })

  return mainPageMachine
}


