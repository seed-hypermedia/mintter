import {EditorDocument} from '@app/editor/use-editor-draft'
import {createFilesMachine} from '@app/files-machine'
import {getRefFromParams} from '@app/main-page-context'
import {DeepPartial} from '@app/types'
import {debug} from '@app/utils/logger'
import {libraryMachine} from '@components/library/library-machine'
import {invoke as tauriInvoke} from '@tauri-apps/api'
import isEqual from 'fast-deep-equal'
import Navaid from 'navaid'
import {
  ActorRefFrom,
  assign,
  createMachine,
  InterpreterFrom,
  send,
  spawn,
} from 'xstate'
import {createDraft, Publication} from './client'

export type MainPageContext = {
  params: {
    docId: string
    version: string | null
    blockId: string | null
    replace: boolean
  }
  document: EditorDocument | null
  recents: Array<string>
  library: ActorRefFrom<typeof libraryMachine>
}

type MainPageEvent =
  | {
      type: 'routeNotFound'
    }
  | {
      type: 'goToEditor'
      docId: string
      replace?: boolean
    }
  | {
      type: 'goToPublication'
      docId: string
      version: string
      blockId?: string
      replace?: boolean
    }
  | {
      type: 'COMMIT.PUBLICATION'
      publication: Publication
    }
  | {
      type: 'goToSettings'
    }
  | {
      type: 'goToHome'
    }
  | {
      type: 'goToPublicationList'
    }
  | {
      type: 'goToDraftList'
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
  | {
      type: 'CREATE_NEW_DRAFT'
    }
  | {
      type: 'OPEN_WINDOW'
      path?: string
    }
  | {
      type: 'EDIT_PUBLICATION'
      docId: string
    }
  | {
      type: 'LOAD.DRAFT'
      ref: string
    }
  | {
      type: 'LOAD.PUBLICATION'
      ref: string
    }

type RouterEvent =
  | {
      type: 'pushHome'
    }
  | {
      type: 'pushPublication'
      docId: string
      version: string
      blockId?: string
      replace?: boolean
    }
  | {
      type: 'pushDraft'
      docId: string
      replace?: boolean
    }
  | {
      type: 'pushSettings'
    }
  | {
      type: 'pushPublicationList'
    }
  | {
      type: 'pushDraftList'
    }

export function defaultMainPageContext(
  overrides: DeepPartial<MainPageContext> = {
    params: {docId: '', version: null, blockId: null, replace: false},
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
    library: spawn(libraryMachine, 'library'),
    ...overrides,
  })
}

export function createMainPageMachine(
  filesService: InterpreterFrom<ReturnType<typeof createFilesMachine>>,
) {
  return createMachine(
    {
      context: () => ({
        params: {
          docId: '',
          version: null,
          blockId: null,
          replace: false,
        },
        document: null,
        recents: [],
        library: spawn(libraryMachine, 'library'),
      }),
      tsTypes: {} as import('./main-page-machine.typegen').Typegen0,
      schema: {context: {} as MainPageContext, events: {} as MainPageEvent},
      invoke: {
        src: 'router',
        id: 'router',
      },
      id: 'main-page',
      initial: 'routes',
      states: {
        idle: {},
        routes: {
          initial: 'idle',
          states: {
            idle: {},
            home: {
              entry: ['clearCurrentDocument', 'clearParams'],
              tags: ['topbar', 'library'],
            },
            editor: {
              tags: ['topbar', 'library'],
              initial: 'validating',
              states: {
                validating: {
                  entry: ['pushToRecents', 'clearCurrentDocument', 'loadDraft'],
                  always: [
                    {
                      actions: 'setDraftParams',
                      cond: 'isMetaEventDifferent',
                      target: 'valid',
                    },
                    {
                      target: 'error',
                    },
                  ],
                },
                valid: {
                  entry: 'pushDraftRoute',
                  exit: 'pushToRecents',
                  tags: ['documentView', 'draft'],
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
                error: {
                  type: 'final',
                },
              },
              on: {
                'SET.CURRENT.DOCUMENT': {
                  actions: 'setCurrentDocument',
                },
              },
            },
            publication: {
              tags: ['topbar', 'library'],
              initial: 'validating',
              states: {
                validating: {
                  entry: [
                    'pushToRecents',
                    'clearCurrentDocument',
                    'loadPublication',
                  ],
                  always: [
                    {
                      actions: 'setPublicationParams',
                      cond: 'isMetaEventDifferent',
                      target: 'valid',
                    },
                    {
                      target: 'error',
                    },
                  ],
                },
                valid: {
                  entry: 'pushPublicationRoute',
                  tags: ['documentView', 'publication'],
                  on: {
                    goToPublication: [
                      {
                        actions: (...args) => {
                          debug(
                            'goToPublication INSIDE PUBLICATION VALID',
                            args,
                          )
                        },
                        cond: 'isEventDifferent',
                        target: 'validating',
                      },
                      {},
                    ],
                    goToEditor: {
                      target: '#main-page.routes.editor',
                    },
                  },
                },
                error: {
                  type: 'final',
                },
              },
              on: {
                'SET.CURRENT.DOCUMENT': {
                  actions: 'setCurrentDocument',
                },
              },
            },
            settings: {
              entry: ['clearCurrentDocument', 'clearParams', 'pushSettings'],
              tags: 'settings',
            },
            publicationList: {
              entry: [
                'clearCurrentDocument',
                'clearParams',
                'pushPublicationListRoute',
              ],
              tags: ['topbar', 'library'],
            },
            draftList: {
              entry: [
                'clearCurrentDocument',
                'clearParams',
                'pushDraftListRoute',
              ],
              tags: ['topbar', 'library'],
            },
            createDraft: {
              invoke: {
                src: 'createNewDraft',
              },
            },
          },
          on: {
            routeNotFound: {
              target: '.idle',
            },
            goToHome: {
              target: '.home',
            },
            goToSettings: {
              target: '.settings',
            },
            goToPublicationList: {
              target: '.publicationList',
            },
            goToDraftList: {
              target: '.draftList',
            },
            goToEditor: {
              target: '.editor',
            },
            goToPublication: {
              target: '.publication',
            },
            'COMMIT.PUBLICATION': {
              target: '.publication',
              actions: ['updateFiles'],
            },
            CREATE_NEW_DRAFT: {
              target: '.createDraft',
            },
            OPEN_WINDOW: {
              actions: 'openWindow',
            },
            EDIT_PUBLICATION: {
              actions: 'editPublication',
            },
          },
        },
      },
      on: {
        goBack: {
          actions: 'navigateBack',
        },
        goForward: {
          actions: 'navigateForward',
        },
      },
    },
    {
      guards: {
        isMetaEventDifferent: (context, _, meta) => {
          let {type, ...eventParams} = meta.state.event
          return !isEqual(context.params, eventParams)
        },
        isEventDifferent: (context, event) => {
          let {type, ...eventParams} = event
          let result = !isEqual(context.params, eventParams)
          return result
        },
      },
      actions: {
        updateFiles: (_, event) => {
          filesService.send(event)
        },
        loadDraft: (_, event) => {
          let ref = getRefFromParams('doc', event.docId, null)
          filesService.send({type: 'LOAD.DRAFT', ref})
        },
        loadPublication: (_, event) => {
          let ref = getRefFromParams('pub', event.docId, event.version)
          filesService.send({type: 'LOAD.PUBLICATION', ref})
        },
        openWindow: async (context, event) => {
          openWindow(event.path)
        },
        pushToRecents: assign((context, event) => {
          let location = window.location.pathname

          let _set = new Set<string>(context.recents)
          if (_set.has(location)) _set.delete(location)
          _set.add(window.location.pathname)
          return {
            recents: [..._set].reverse(),
          }
        }),
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
              replace: event.replace,
            }
          },
        }),
        setPublicationParams: assign({
          params: (c, e, meta) => {
            // debug('\n\n === setPublicationParams: ', JSON.stringify({ c, e, meta }))
            let {event} = meta.state
            return {
              docId: event.docId,
              version: event.version,
              blockId: event.blockId,
              replace: event.replace,
            }
          },
        }),
        pushPublicationRoute: send(
          (context) => {
            return {
              type: 'pushPublication',
              docId: context.params.docId,
              version: context.params.version,
              blockId: context.params.blockId,
              replace: context.params.replace,
            }
          },
          {to: 'router'},
        ),
        pushDraftRoute: send(
          (context) => {
            return {
              type: 'pushDraft',
              docId: context.params.docId,
              blockId: context.params.blockId,
              replace: context.params.replace,
            }
          },
          {to: 'router'},
        ),
        pushSettings: send(
          {
            type: 'pushSettings',
          },
          {to: 'router'},
        ),
        clearParams: assign((_) => ({
          params: {
            docId: '',
            version: null,
            blockId: null,
            replace: false,
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
        pushDraftListRoute: send(
          {
            type: 'pushDraftList',
          },
          {to: 'router'},
        ),
        pushPublicationListRoute: send(
          {
            type: 'pushPublicationList',
          },
          {to: 'router'},
        ),
        editPublication: (_, event) => {
          createDraft(event.docId).then((doc) => {
            openWindow(`/editor/${doc.id}`)
          })
        },
      },
      services: {
        // router reference: https://gist.github.com/ChrisShank/369aa8cbd4002244d7769bd1ba3e232a
        router: () => (sendBack, receive) => {
          let navRouter = Navaid('/', () => sendBack('goToHome'))
          // Deserialize events from the URL
          navRouter
            .on('/', () => {
              sendBack('goToHome')
            })
            .on('/settings', () => {
              sendBack('goToSettings')
            })
            .on('/publications', () => {
              sendBack('goToPublicationList')
            })
            .on('/drafts', () => {
              sendBack('goToDraftList')
            })
            .on<{docId: string}>('/editor/:docId', (params) => {
              return params
                ? sendBack({type: 'goToEditor', ...params})
                : sendBack('routeNotFound')
            })
            .on<{
              docId: string
              version?: string
              blockId?: string
            }>('/p/:docId/:version?/:blockId?', (params) => {
              return params
                ? sendBack({
                    type: 'goToPublication',
                    docId: params.docId,
                    version: params.version,
                    blockId: params.blockId,
                  })
                : sendBack('routeNotFound')
            })

          receive((event: RouterEvent) => {
            if (event.type == 'pushHome') {
              navRouter.route('/')
            } else if (event.type == 'pushPublication') {
              let {pathname} = window.location
              let newRoute = `/p/${event.docId}${
                event.version
                  ? `/${event.version}${
                      event.blockId ? `/${event.blockId}` : ''
                    }`
                  : ''
              }`
              if (pathname != newRoute) {
                navRouter.route(newRoute, event.replace)
              }
            } else if (event.type == 'pushDraft') {
              let {pathname} = window.location
              let newRoute = `/editor/${event.docId}`
              if (pathname != newRoute) {
                navRouter.route(newRoute, event.replace)
              }
            } else if (event.type == 'pushPublicationList') {
              navRouter.route('/publications')
            } else if (event.type == 'pushDraftList') {
              navRouter.route('/drafts')
            } else if (event.type == 'pushSettings') {
              navRouter.route('/settings')
            } else {
              navRouter.route('/')
            }
          })

          navRouter.listen()

          return () => navRouter?.unlisten?.()
        },
        createNewDraft: () => (sendBack) => {
          createDraft().then((document) => {
            sendBack({type: 'goToEditor', docId: document.id, replace: true})
          })
        },
      },
    },
  )
}

function openWindow(path?: string) {
  if (path) {
    // Open window with path
    tauriInvoke('plugin:window|open', {path})
  } else {
    createDraft().then((doc) => {
      let path = `/editor/${doc.id}`
      // open window with new path
      tauriInvoke('plugin:window|open', {path})
    })
  }
}
